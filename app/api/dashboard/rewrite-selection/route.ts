import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { generateWithClaude } from '@/lib/claude/client';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { isNearVerbatimRewrite } from '@/lib/rewrite/quality';

interface RewriteSelectionResponse {
  replacement: string;
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

function parseRewriteSelectionResponse(response: string): RewriteSelectionResponse | null {
  try {
    return JSON.parse(extractJsonText(response)) as RewriteSelectionResponse;
  } catch (error) {
    console.error('Selection rewrite JSON parse error:', error);
    console.error('Selection rewrite raw preview:', response.slice(0, 1000));
    return null;
  }
}

function buildSelectionRewritePrompt({
  selectedText,
  paragraphText,
  beforeText,
  afterText,
  draftText,
  platform,
  profile,
}: {
  selectedText: string;
  paragraphText: string;
  beforeText: string;
  afterText: string;
  draftText: string;
  platform: 'linkedin' | 'x';
  profile: {
    jobDescription?: string | null;
    primaryTopics?: string[] | null;
    avoidTopics?: string[] | null;
    styleBible?: string | null;
  } | null;
}) {
  return `
You are helping a user rewrite a selected section of a social post.

AUTHOR CONTEXT:
${profile?.jobDescription || 'A professional in their field.'}

STYLE BIBLE:
${profile?.styleBible || 'Keep the voice professional, clear, and natural.'}

TOPICS OF INTEREST:
${profile?.primaryTopics?.join(', ') || 'None provided'}

TOPICS TO AVOID:
${profile?.avoidTopics?.join(', ') || 'None provided'}

PLATFORM:
${platform}

FULL DRAFT:
${draftText}

CURRENT PARAGRAPH:
${paragraphText}

TEXT BEFORE THE SELECTION:
${beforeText || '[start of paragraph]'}

SELECTED TEXT TO REWRITE:
${selectedText}

TEXT AFTER THE SELECTION:
${afterText || '[end of paragraph]'}

RULES:
1. Rewrite ONLY the selected text.
2. Preserve the same meaning and keep it fitting naturally with the surrounding paragraph.
3. Keep the same voice and level of polish as the rest of the draft.
4. Do not introduce new claims, facts, names, or numbers.
5. Keep roughly the same length unless a better phrasing needs a small change.
6. Return plain text only for the replacement. No markdown. No quotes around it.
7. Do not use em dashes.
8. The result must feel materially rephrased, not lightly edited.
9. If the platform is LinkedIn, do not use markdown-style bold, italics, bullets, numbered lists, or heading markers. Use plain text and line breaks only.

Return valid JSON in exactly this shape:
{
  "replacement": "..."
}

Return ONLY valid JSON.
`.trim();
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      userId,
      selectedText,
      paragraphText,
      beforeText,
      afterText,
      draftText,
      platform,
    }: {
      userId?: string;
      selectedText?: string;
      paragraphText?: string;
      beforeText?: string;
      afterText?: string;
      draftText?: string;
      platform?: 'linkedin' | 'x';
    } = await req.json();

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trimmedSelection = selectedText?.trim() || '';
    const trimmedParagraph = paragraphText?.trim() || '';
    const trimmedDraft = draftText?.trim() || '';
    if (!trimmedSelection || !trimmedParagraph || !trimmedDraft || !platform) {
      return NextResponse.json({ error: 'Missing rewrite context.' }, { status: 400 });
    }

    const profile = await db.query.voiceProfiles.findFirst({
      where: eq(voiceProfiles.userId, userId),
      columns: {
        jobDescription: true,
        primaryTopics: true,
        avoidTopics: true,
        styleBible: true,
      },
    });

    const prompt = buildSelectionRewritePrompt({
      selectedText: trimmedSelection,
      paragraphText: trimmedParagraph,
      beforeText: beforeText?.trim() || '',
      afterText: afterText?.trim() || '',
      draftText: trimmedDraft,
      platform,
      profile: profile ?? null,
    });

    let parsed = parseRewriteSelectionResponse(await generateWithClaude(prompt, undefined, 700));
    let replacement = parsed?.replacement?.replace(/\s+/g, ' ').trim() || '';
    if (platform === 'linkedin') {
      replacement = sanitizeLinkedInFormatting(replacement);
    }

    if (!replacement || isNearVerbatimRewrite(trimmedSelection, replacement)) {
      const strictPrompt = `${prompt}

STRICT CORRECTION:
- The replacement must be genuinely rephrased.
- If you keep the same wording with only tiny edits, the answer is wrong.
- Still return only the replacement text in JSON.`;

      parsed = parseRewriteSelectionResponse(await generateWithClaude(strictPrompt, undefined, 700));
      replacement = parsed?.replacement?.replace(/\s+/g, ' ').trim() || '';
      if (platform === 'linkedin') {
        replacement = sanitizeLinkedInFormatting(replacement);
      }
    }

    if (!replacement || isNearVerbatimRewrite(trimmedSelection, replacement)) {
      return NextResponse.json({ error: 'Failed to generate a usable rewrite.' }, { status: 422 });
    }

    return NextResponse.json({ replacement });
  } catch (error) {
    console.error('Selection rewrite failed:', error);
    return NextResponse.json({ error: 'Failed to rewrite selection.' }, { status: 500 });
  }
}
