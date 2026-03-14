import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateWithClaude } from '@/lib/claude/client';
import { buildChatSystemPrompt, buildChatContextPrompt } from '@/lib/claude/prompts/chat-assistant';
import {
  ArticleDraftResponse,
  DraftEditResponse,
  buildArticleDraftsPrompt,
  buildDraftEditPrompt,
  buildQuickPostPrompt,
  buildResearchDraftsPrompt,
} from '@/lib/claude/prompts/post-generation';
import { extractFirstUrl, ingestArticleUrl } from '@/lib/news/article-ingest';
import {
  looksLikeBroadResearchRequest,
  researchTopicPrompt,
  wantsExplicitlySinglePost,
} from '@/lib/news/research';
import {
  ARTICLE_DRAFT_FOLLOW_UP,
  QUICK_POST_FOLLOW_UP,
  REFINE_ONLY_FOLLOW_UP,
} from '@/lib/chat/follow-ups';
import { extractRequiredAdditions, getMissingRequiredAdditions } from '@/lib/rewrite/instruction-validation';
import {
  countWords,
  detectLengthIntent,
  exceedsLengthIntent,
  getMaxWordCount,
  isNearVerbatimRewrite,
  trimToWordLimit,
} from '@/lib/rewrite/quality';

interface PostBlock {
  type: 'post';
  platform: 'linkedin' | 'x';
  content: string;
  isThread?: boolean;
  threadParts?: string[];
}

interface TextBlock {
  type: 'text';
  content: string;
}

interface SourceBlock {
  type: 'source';
  title: string;
  url: string;
  subtitle: string;
}

type ContentBlock = PostBlock | TextBlock | SourceBlock;

interface DraftOptionInput {
  index: number;
  platform: 'linkedin' | 'x';
  content: string;
}

function extractJsonText(response: string): string {
  let jsonString = response.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const firstBrace = jsonString.indexOf('{');
  const lastBrace = jsonString.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonString = jsonString.slice(firstBrace, lastBrace + 1);
  }

  return jsonString;
}

function buildBlocksReply(blocks: ContentBlock[]): string {
  return blocks.map((block) => {
    if (block.type === 'text') {
      return block.content;
    }

    if (block.type === 'source') {
      return `[SOURCE]\n${block.title}\n${block.url}`;
    }

    return `[${block.platform.toUpperCase()} POST]\n${block.content}`;
  }).join('\n\n');
}

function parseArticleDraftResponse(response: string): ArticleDraftResponse | null {
  try {
    return JSON.parse(extractJsonText(response)) as ArticleDraftResponse;
  } catch (error) {
    console.error('Article draft JSON parse error:', error);
    console.error('Article draft raw preview:', response.slice(0, 1000));
    return null;
  }
}

function parseDraftEditResponse(response: string): DraftEditResponse | null {
  try {
    return JSON.parse(extractJsonText(response)) as DraftEditResponse;
  } catch (error) {
    console.error('Draft edit JSON parse error:', error);
    console.error('Draft edit raw preview:', response.slice(0, 1000));
    return null;
  }
}

function buildDraftEditReply(
  instruction: string,
  originals: DraftOptionInput[],
  edits: Array<{ index: number; content: string }>,
  requiredAdditions: string[] = []
) {
  if (requiredAdditions.length > 0) {
    return edits.length === 1
      ? 'I updated the draft to include those details.'
      : 'I updated the drafts to include those details.';
  }

  if (edits.length !== 1) {
    return 'I updated the drafts.';
  }

  const original = originals.find((draft) => draft.index === edits[0].index);
  if (!original) {
    return 'I updated the draft.';
  }

  const originalWords = countWords(original.content);
  const editedWords = countWords(edits[0].content);
  const lowerInstruction = instruction.toLowerCase();

  if (detectLengthIntent(lowerInstruction) === 'half' || detectLengthIntent(lowerInstruction) === 'shorter') {
    return `I shortened the draft from ${originalWords} words to ${editedWords}.`;
  }

  if (detectLengthIntent(lowerInstruction) === 'longer') {
    return `I expanded the draft from ${originalWords} words to ${editedWords}.`;
  }

  return 'I updated the draft.';
}

function splitParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function preserveParagraphStructure(originalContent: string, editedContent: string) {
  const originalParagraphs = splitParagraphs(originalContent);
  const editedParagraphs = splitParagraphs(editedContent);

  if (originalParagraphs.length <= 1 || editedParagraphs.length > 1) {
    return editedContent.trim();
  }

  const sentences = editedParagraphs[0]
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length < originalParagraphs.length) {
    return editedContent.trim();
  }

  const originalWordCounts = originalParagraphs.map((paragraph) => countWords(paragraph));
  const totalOriginalWords = originalWordCounts.reduce((sum, count) => sum + count, 0) || 1;
  const totalEditedWords = countWords(editedContent);
  const rebuiltParagraphs: string[] = [];
  let sentenceIndex = 0;

  for (let index = 0; index < originalParagraphs.length; index += 1) {
    const isLastParagraph = index === originalParagraphs.length - 1;
    const targetWordCount = Math.max(
      1,
      Math.round((originalWordCounts[index] / totalOriginalWords) * totalEditedWords)
    );
    const nextParagraphSentences: string[] = [];
    let nextParagraphWordCount = 0;

    while (sentenceIndex < sentences.length) {
      const sentence = sentences[sentenceIndex];
      const sentenceWordCount = countWords(sentence);
      const wouldUndershoot = nextParagraphSentences.length === 0;
      const shouldKeepAdding = isLastParagraph
        || wouldUndershoot
        || nextParagraphWordCount < targetWordCount;

      if (!shouldKeepAdding) {
        break;
      }

      nextParagraphSentences.push(sentence);
      nextParagraphWordCount += sentenceWordCount;
      sentenceIndex += 1;

      if (!isLastParagraph && nextParagraphWordCount >= targetWordCount) {
        break;
      }
    }

    if (nextParagraphSentences.length > 0) {
      rebuiltParagraphs.push(nextParagraphSentences.join(' '));
    }
  }

  if (sentenceIndex < sentences.length) {
    if (rebuiltParagraphs.length === 0) {
      rebuiltParagraphs.push(sentences.slice(sentenceIndex).join(' '));
    } else {
      rebuiltParagraphs[rebuiltParagraphs.length - 1] = `${rebuiltParagraphs[rebuiltParagraphs.length - 1]} ${sentences.slice(sentenceIndex).join(' ')}`.trim();
    }
  }

  return rebuiltParagraphs.join('\n\n').trim() || editedContent.trim();
}

function sanitizeLinkedInFormatting(content: string) {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1$2')
    .split('\n')
    .map((line) => line
      .replace(/^\s*(?:[*\-+]|•)\s+/, '')
      .replace(/^\s*\d+[.)]\s+/, '')
      .replace(/^\s*>\s+/, '')
      .replace(/^\s*#{1,6}\s+/, '')
      .trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizePostContent(platform: 'linkedin' | 'x', content: string) {
  if (platform !== 'linkedin') {
    return content.trim();
  }

  return sanitizeLinkedInFormatting(content);
}

function sanitizePostBlocks(blocks: ContentBlock[]) {
  return blocks.map((block) => {
    if (block.type !== 'post') {
      return block;
    }

    return {
      ...block,
      content: sanitizePostContent(block.platform, block.content),
    };
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      messages,
      userId,
      draftOptions,
      activeDraftIndex,
    }: {
      messages: Array<{ role: 'user' | 'assistant'; content?: string }>;
      userId?: string;
      draftOptions?: DraftOptionInput[];
      activeDraftIndex?: number;
    } = await req.json();

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lastMessage = messages[messages.length - 1].content || '';
    const lowerMessage = lastMessage.toLowerCase();

    const profile = await db.query.voiceProfiles.findFirst({
      where: eq(voiceProfiles.userId, userId),
    });

    const detectedUrl = extractFirstUrl(lastMessage);
    if (detectedUrl) {
      const ingestionResult = await ingestArticleUrl(detectedUrl);

      if (!ingestionResult.ok) {
        const fallbackBlocks: ContentBlock[] = [
          {
            type: 'text',
            content: ingestionResult.reason,
          },
          {
            type: 'text',
            content: 'If you want, paste the article or post text directly and I can still draft posts from it.',
          },
        ];

        return NextResponse.json({
          blocks: fallbackBlocks,
          reply: buildBlocksReply(fallbackBlocks),
        });
      }

      const prompt = buildArticleDraftsPrompt(ingestionResult.article, profile || {});
      const response = await generateWithClaude(prompt, undefined, 3500);
      const parsed = parseArticleDraftResponse(response);
      if (!parsed || !Array.isArray(parsed.posts) || parsed.posts.length === 0) {
        const fallbackBlocks: ContentBlock[] = [
          {
            type: 'text',
            content: `I read "${ingestionResult.article.title}", but I hit an issue while formatting the drafts.`,
          },
          {
            type: 'text',
            content: 'Try sending the link again, or paste the article text directly and I can work from that.',
          },
        ];

        return NextResponse.json({
          blocks: fallbackBlocks,
          reply: buildBlocksReply(fallbackBlocks),
        });
      }

      let articleDraftBlocks: ContentBlock[] = [
        {
          type: 'text',
          content: parsed.intro || `I read "${ingestionResult.article.title}" and drafted 3 possible directions.`,
        },
        ...parsed.posts.slice(0, 3).map((post) => ({
          type: 'post' as const,
          platform: 'linkedin' as const,
          content: post.content,
        })),
        {
          type: 'text',
          content: parsed.followUp || ARTICLE_DRAFT_FOLLOW_UP,
        },
      ];
      articleDraftBlocks = sanitizePostBlocks(articleDraftBlocks);

      const articleSourceForOverlap = [
        ingestionResult.article.title,
        ingestionResult.article.summary,
        ...ingestionResult.article.keyPoints,
        ingestionResult.article.content.slice(0, 1800),
      ].join('\n');

      const articlePosts = articleDraftBlocks.filter(
        (block): block is PostBlock => block.type === 'post'
      );
      const articleNeedsRetry = articlePosts.some((post) =>
        isNearVerbatimRewrite(articleSourceForOverlap, post.content)
      );

      if (articleNeedsRetry) {
        const stricterPrompt = `${prompt}

CRITICAL ANTI-COPY ENFORCEMENT:
- Do not reuse source phrasing, sentence structure, or multi-sentence passages.
- If a line from your draft could be mistaken for a lightly edited sentence from the source, rewrite it completely.
- Use the facts, but express them in fresh wording and a different structure.`;
        const retriedResponse = await generateWithClaude(stricterPrompt, undefined, 3500);
        const retriedParsed = parseArticleDraftResponse(retriedResponse);
        if (retriedParsed?.posts?.length) {
          articleDraftBlocks = [
            {
              type: 'text',
              content: retriedParsed.intro || parsed.intro || `I read "${ingestionResult.article.title}" and drafted 3 possible directions.`,
            },
            ...retriedParsed.posts.slice(0, 3).map((post) => ({
              type: 'post' as const,
              platform: 'linkedin' as const,
              content: post.content,
            })),
            {
              type: 'text',
              content: retriedParsed.followUp || parsed.followUp || ARTICLE_DRAFT_FOLLOW_UP,
            },
          ];
          articleDraftBlocks = sanitizePostBlocks(articleDraftBlocks);
        }
      }

      return NextResponse.json({
        blocks: articleDraftBlocks,
        reply: buildBlocksReply(articleDraftBlocks),
      });
    }

    const availableDrafts = Array.isArray(draftOptions) ? draftOptions : [];
    const normalizedActiveDraftIndex = typeof activeDraftIndex === 'number' ? activeDraftIndex : 0;
    const wantsAllDraftsEdit = /\b(all three|all 3|all options|all drafts|every option|each option|all of them)\b/.test(lowerMessage);
    const explicitNewDraftRequest = /\b(new post|new draft|from scratch|different topic|another topic|write a post about|create a post about|generate a post about|draft a post about)\b/.test(lowerMessage);
    const explicitDraftEditIntent = /\b(make|rewrite|revise|edit|shorter|shorten|trim|tighten|cut|reduce|condense|expand|lengthen|polish|improve|simplify|clarify|reword|change|adjust|tweak|swap|remove|add)\b/.test(lowerMessage)
      || /\b(this|that|draft|option|version|post)\b/.test(lowerMessage);
    const explicitRewriteRequest = /\b(rewrite|rephrase|in my own words|say this differently|make this sound like me|write this in my voice|put this in my voice)\b/.test(lowerMessage);

    if (availableDrafts.length > 0 && !explicitNewDraftRequest && (wantsAllDraftsEdit || explicitDraftEditIntent)) {
      const targetDrafts = wantsAllDraftsEdit
        ? availableDrafts
        : [availableDrafts[normalizedActiveDraftIndex] ?? availableDrafts[0]].filter(Boolean);
      const allowedDraftIndexes = new Set(targetDrafts.map((draft) => draft.index));
      const singleTargetDraftIndex = wantsAllDraftsEdit ? null : targetDrafts[0]?.index ?? null;
      const lengthIntent = detectLengthIntent(lowerMessage);
      const requiredAdditions = extractRequiredAdditions(lastMessage);

      const runDraftEdit = async (instruction: string) => {
        const prompt = buildDraftEditPrompt(
          instruction,
          targetDrafts,
          profile || {},
          wantsAllDraftsEdit,
          requiredAdditions
        );
        const response = await generateWithClaude(prompt, undefined, 2500);
        return parseDraftEditResponse(response);
      };

      const finalizeDraftEdits = (parsedEdits: Array<{ index: number; content: string }>) => parsedEdits.map((edit) => {
        const original = targetDrafts.find((draft) => draft.index === edit.index);
        if (!original) {
          return edit;
        }

        let nextContent = edit.content;
        if (exceedsLengthIntent(original.content, nextContent, lengthIntent)) {
          nextContent = trimToWordLimit(nextContent, getMaxWordCount(countWords(original.content), lengthIntent));
        }

        if (isNearVerbatimRewrite(original.content, nextContent)) {
          nextContent = `${trimToWordLimit(nextContent, Math.max(1, countWords(nextContent) - 20))}`.trim();
        }

        return {
          ...edit,
          content: sanitizePostContent(
            original.platform,
            preserveParagraphStructure(original.content, nextContent)
          ),
        };
      });

      const getMissingAdditionsByDraft = (edits: Array<{ index: number; content: string }>) => edits.map((edit) => ({
        index: edit.index,
        missing: getMissingRequiredAdditions(edit.content, requiredAdditions),
      })).filter((item) => item.missing.length > 0);

      let parsed = await runDraftEdit(lastMessage);

      if (!parsed || !Array.isArray(parsed.drafts) || parsed.drafts.length === 0) {
        return NextResponse.json({
          reply: 'I understood the edit request, but I hit an issue rewriting that draft. Try asking again with a bit more direction.',
        });
      }

      parsed = {
        ...parsed,
        drafts: parsed.drafts
          .map((edit) => ({
            ...edit,
            index: singleTargetDraftIndex ?? edit.index,
          }))
          .filter((edit) => allowedDraftIndexes.has(edit.index)),
      };

      if (parsed.drafts.length === 0) {
        return NextResponse.json({
          reply: 'I understood the edit request, but I could not map the rewrite back to the selected draft. Try again.',
        });
      }

      const needsRetry = parsed.drafts.some((edit) => {
        const original = targetDrafts.find((draft) => draft.index === edit.index);
        return original ? exceedsLengthIntent(original.content, edit.content, lengthIntent) : false;
      });

      if (needsRetry) {
        const strictInstruction = `${lastMessage}

STRICT LENGTH CORRECTION:
Return revised drafts that are actually shorter than the originals.
Do not describe a new word count unless the content truly matches it.
${targetDrafts.map((draft) => `Draft ${draft.index + 1} must be ${getMaxWordCount(countWords(draft.content), lengthIntent)} words or fewer.`).join('\n')}`;
        const retried = await runDraftEdit(strictInstruction);
        if (retried && Array.isArray(retried.drafts) && retried.drafts.length > 0) {
          parsed = {
            ...retried,
            drafts: retried.drafts
              .map((edit) => ({
                ...edit,
                index: singleTargetDraftIndex ?? edit.index,
              }))
              .filter((edit) => allowedDraftIndexes.has(edit.index)),
          };
        }
      }

      const normalizedDraftEdits = parsed.drafts.map((edit) => {
        const original = targetDrafts.find((draft) => draft.index === edit.index);
        if (!original || !exceedsLengthIntent(original.content, edit.content, lengthIntent)) {
          return {
            ...edit,
            content: sanitizePostContent(
              original?.platform ?? 'linkedin',
              isNearVerbatimRewrite(original?.content ?? '', edit.content)
                ? trimToWordLimit(edit.content, Math.max(1, countWords(edit.content) - 20))
                : edit.content
            ),
          };
        }

        return {
          ...edit,
          content: sanitizePostContent(
            original.platform,
            trimToWordLimit(edit.content, getMaxWordCount(countWords(original.content), lengthIntent))
          ),
        };
      });

      const copyNeedsRetry = normalizedDraftEdits.some((edit) => {
        const original = targetDrafts.find((draft) => draft.index === edit.index);
        return original ? isNearVerbatimRewrite(original.content, edit.content) : false;
      });

      if (copyNeedsRetry) {
        const stricterInstruction = `${lastMessage}

CRITICAL ANTI-COPY ENFORCEMENT:
- Rewrite the wording completely.
- Do not echo the source draft's sentence structure or distinctive phrases.
- Keep the same idea, but make it feel newly written in the author's voice.`;
        const retried = await runDraftEdit(stricterInstruction);
        if (retried && Array.isArray(retried.drafts) && retried.drafts.length > 0) {
          parsed = {
            ...retried,
            drafts: retried.drafts
              .map((edit) => ({
                ...edit,
                index: singleTargetDraftIndex ?? edit.index,
              }))
              .filter((edit) => allowedDraftIndexes.has(edit.index)),
          };
        }
      }

      let finalDraftEdits = finalizeDraftEdits(parsed.drafts);
      const missingAdditionsByDraft = getMissingAdditionsByDraft(finalDraftEdits);

      if (missingAdditionsByDraft.length > 0) {
        const stricterInstruction = `${lastMessage}

MANDATORY FOLLOWTHROUGH CORRECTION:
The revised draft is wrong unless it explicitly includes these requested details:
${requiredAdditions.map((addition) => `- ${addition}`).join('\n')}

Every targeted draft must clearly include all of those details.`;
        const retried = await runDraftEdit(stricterInstruction);
        if (retried && Array.isArray(retried.drafts) && retried.drafts.length > 0) {
          parsed = {
            ...retried,
            drafts: retried.drafts
              .map((edit) => ({
                ...edit,
                index: singleTargetDraftIndex ?? edit.index,
              }))
              .filter((edit) => allowedDraftIndexes.has(edit.index)),
          };
          finalDraftEdits = finalizeDraftEdits(parsed.drafts);
        }
      }

      const remainingMissingAdditions = getMissingAdditionsByDraft(finalDraftEdits);
      if (remainingMissingAdditions.length > 0) {
        return NextResponse.json({
          reply: 'I could not reliably incorporate every requested detail into the targeted draft(s). Try again with the exact wording you want included.',
        });
      }

      return NextResponse.json({
        reply: buildDraftEditReply(lastMessage, targetDrafts, finalDraftEdits, requiredAdditions),
        draftEdits: finalDraftEdits,
      });
    }

    const isCreateRequest = /create|write|generate|draft|make/.test(lowerMessage);
    const isLinkedIn = /linkedin/i.test(lowerMessage);
    const isX = /\bx\b|twitter|tweet|thread/i.test(lowerMessage);
    const shouldRunTopicResearch = looksLikeBroadResearchRequest(lastMessage);

    if (wantsExplicitlySinglePost(lastMessage) && isCreateRequest) {
      const linkedInPrompt = buildQuickPostPrompt(lastMessage, profile || {}, 'linkedin');
      let linkedInContent = await generateWithClaude(linkedInPrompt);
      if (explicitRewriteRequest && isNearVerbatimRewrite(lastMessage, linkedInContent)) {
        const stricterPrompt = `${linkedInPrompt}

CRITICAL ANTI-COPY ENFORCEMENT:
- The user's message may include source text.
- Do not echo or lightly edit that wording.
- Rewrite from scratch so the result clearly uses fresh phrasing.`;
        linkedInContent = await generateWithClaude(stricterPrompt);
      }
      const blocks: ContentBlock[] = [
        { type: 'text', content: "Here's a LinkedIn post based on your request:" },
        { type: 'post', platform: 'linkedin', content: sanitizePostContent('linkedin', linkedInContent) },
        { type: 'text', content: QUICK_POST_FOLLOW_UP },
      ];
      return NextResponse.json({ blocks, reply: buildBlocksReply(blocks) });
    }

    if (shouldRunTopicResearch) {
      const researchBrief = await researchTopicPrompt(lastMessage);

      if (researchBrief) {
        const researchPrompt = buildResearchDraftsPrompt(researchBrief, profile || {});
        const researchResponse = await generateWithClaude(researchPrompt, undefined, 3500);
        const parsed = parseArticleDraftResponse(researchResponse);

        if (parsed && Array.isArray(parsed.posts) && parsed.posts.length > 0) {
          const blocks: ContentBlock[] = [
            {
              type: 'text',
              content: parsed.intro || `I pulled together a quick brief on ${researchBrief.query}.`,
            },
            {
              type: 'text',
              content: `${researchBrief.summary}\n\n${researchBrief.keyFindings.map((finding) => `- ${finding}`).join('\n')}`,
            },
            ...researchBrief.sources.map((source) => ({
              type: 'source' as const,
              title: source.title,
              url: source.url,
              subtitle: source.publishedDate
                ? `${source.domain} · ${source.publishedDate}`
                : `${source.domain} · Source`,
            })),
            ...parsed.posts.slice(0, 3).map((post) => ({
              type: 'post' as const,
              platform: 'linkedin' as const,
              content: sanitizePostContent('linkedin', post.content),
            })),
            {
              type: 'text',
              content: parsed.followUp || QUICK_POST_FOLLOW_UP,
            },
          ];

          return NextResponse.json({ blocks, reply: buildBlocksReply(blocks) });
        }
      }
    }

    if (isCreateRequest && (isLinkedIn || isX)) {
      // Direct content creation
      const platform = isLinkedIn ? 'linkedin' : 'x';
      const prompt = buildQuickPostPrompt(lastMessage, profile || {}, platform);
      let content = await generateWithClaude(prompt);
      if (explicitRewriteRequest && isNearVerbatimRewrite(lastMessage, content)) {
        const stricterPrompt = `${prompt}

CRITICAL ANTI-COPY ENFORCEMENT:
- The user's message may include source text.
- Do not echo or lightly edit that wording.
- Rewrite from scratch so the result clearly uses fresh phrasing.`;
        content = await generateWithClaude(stricterPrompt);
      }
      
      const blocks: ContentBlock[] = [];
      
      if (platform === 'x') {
        try {
          const parsed = JSON.parse(content);
          blocks.push({ type: 'text', content: parsed.isThread ? "Here's an X thread:" : "Here's your tweet:" });
          
          if (parsed.isThread && parsed.threadBreakdown) {
            blocks.push({
              type: 'post',
              platform: 'x',
              content: parsed.threadBreakdown.join('\n\n'),
              isThread: true,
              threadParts: parsed.threadBreakdown,
            });
          } else {
            blocks.push({
              type: 'post',
              platform: 'x',
              content: parsed.content || content,
            });
          }
        } catch {
          blocks.push({ type: 'text', content: "Here's your tweet:" });
          blocks.push({ type: 'post', platform: 'x', content });
        }
      } else {
        blocks.push({ type: 'text', content: "Here's your LinkedIn post:" });
        blocks.push({ type: 'post', platform: 'linkedin', content: sanitizePostContent('linkedin', content) });
      }
      
      blocks.push({ type: 'text', content: REFINE_ONLY_FOLLOW_UP });

      return NextResponse.json({ blocks, reply: buildBlocksReply(blocks) });
    }

    if (isCreateRequest) {
      const linkedInPrompt = buildQuickPostPrompt(lastMessage, profile || {}, 'linkedin');
      let linkedInContent = await generateWithClaude(linkedInPrompt);
      if (explicitRewriteRequest && isNearVerbatimRewrite(lastMessage, linkedInContent)) {
        const stricterPrompt = `${linkedInPrompt}

CRITICAL ANTI-COPY ENFORCEMENT:
- The user's message may include source text.
- Do not echo or lightly edit that wording.
- Rewrite from scratch so the result clearly uses fresh phrasing.`;
        linkedInContent = await generateWithClaude(stricterPrompt);
      }
      
      const blocks: ContentBlock[] = [
        { type: 'text', content: "Here's a LinkedIn post based on your request:" },
        { type: 'post', platform: 'linkedin', content: sanitizePostContent('linkedin', linkedInContent) },
        { type: 'text', content: QUICK_POST_FOLLOW_UP },
      ];

      return NextResponse.json({ blocks, reply: buildBlocksReply(blocks) });
    }

    const systemPrompt = buildChatSystemPrompt(profile ?? null);
    const priorMessages = messages
      .slice(0, -1)
      .filter((message): message is { role: 'user' | 'assistant'; content: string } => Boolean(message.content))
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
    const contextPrompt = buildChatContextPrompt(lastMessage, priorMessages);
    
    const reply = await generateWithClaude(contextPrompt, systemPrompt);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
