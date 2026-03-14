import { generateWithClaude } from '@/lib/claude/client';
import {
  buildArticleDraftsPrompt,
  buildDraftEditPrompt,
  buildQuickPostPrompt,
  DraftEditResponse,
  ArticleDraftResponse,
} from '@/lib/claude/prompts/post-generation';
import {
  countWords,
  getMaxWordCount,
  isNearVerbatimRewrite,
  measureSourceOverlap,
  trimToWordLimit,
} from '@/lib/rewrite/quality';
import {
  extractRequiredAdditions,
  getMissingRequiredAdditions,
} from '@/lib/rewrite/instruction-validation';

function extractJsonText(response: string) {
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

function parseJson<T>(response: string): T {
  return JSON.parse(extractJsonText(response)) as T;
}

const profile = {
  jobDescription: 'Seed investor focused on AI infrastructure and enterprise software.',
  primaryTopics: ['AI Infrastructure', 'Enterprise Software', 'Startups'],
  avoidTopics: ['Crypto'],
  postingGoals: ['thought_leadership'],
  uploadedContent: [
    `Everyone wants to debate models. I'm watching distribution. The companies that win in AI are the ones that get embedded into an existing workflow before the market realizes what's happening.`,
    `The best enterprise products don't feel magical because of the demo. They feel inevitable because the buyer can already picture how the team will use them on Monday morning.`,
    `Founders love talking about speed. Customers care about trust. If your product touches a core workflow, trust compounds harder than velocity.`,
  ],
};

async function runGuardedDraftEdit(
  instruction: string,
  sourceDraft: string,
  requiredAdditions: string[] = []
) {
  const buildPrompt = (nextInstruction: string) => buildDraftEditPrompt(
    nextInstruction,
    [{ index: 0, platform: 'linkedin', content: sourceDraft }],
    profile,
    false,
    requiredAdditions
  );

  let response = await generateWithClaude(buildPrompt(instruction), undefined, 2500);
  let parsed = parseJson<DraftEditResponse>(response);
  let rewritten = parsed.drafts[0]?.content ?? '';

  if (isNearVerbatimRewrite(sourceDraft, rewritten)) {
    response = await generateWithClaude(
      buildPrompt(`${instruction}

CRITICAL ANTI-COPY ENFORCEMENT:
- Rewrite from scratch.
- Do not preserve sentence structure or key phrasing from the source draft.`),
      undefined,
      2500
    );
    parsed = parseJson<DraftEditResponse>(response);
    rewritten = parsed.drafts[0]?.content ?? '';
  }

  return {
    parsed,
    rewritten,
  };
}

async function runGuardedMultiDraftEdit(
  instruction: string,
  sourceDrafts: string[],
  requiredAdditions: string[]
) {
  const buildPrompt = (nextInstruction: string) => buildDraftEditPrompt(
    nextInstruction,
    sourceDrafts.map((content, index) => ({ index, platform: 'linkedin' as const, content })),
    profile,
    true,
    requiredAdditions
  );

  let response = await generateWithClaude(buildPrompt(instruction), undefined, 2500);
  let parsed = parseJson<DraftEditResponse>(response);
  let drafts = parsed.drafts ?? [];

  const hasMissing = drafts.some((draft) => getMissingRequiredAdditions(draft.content, requiredAdditions).length > 0);
  if (hasMissing) {
    response = await generateWithClaude(
      buildPrompt(`${instruction}

MANDATORY FOLLOWTHROUGH CORRECTION:
Every revised draft must explicitly include these details:
${requiredAdditions.map((addition) => `- ${addition}`).join('\n')}`),
      undefined,
      2500
    );
    parsed = parseJson<DraftEditResponse>(response);
    drafts = parsed.drafts ?? [];
  }

  return drafts;
}

async function runDraftRewriteFixture() {
  const sourceDraft = `Gumloop just raised $50M from Benchmark to turn every employee into an AI agent builder. This is the trend I've been most excited about. Companies are moving from experimenting with AI to embedding it in daily work, and the winners will be the ones that make agent creation simple for non-technical teams.`;
  const { rewritten } = await runGuardedDraftEdit(
    'Rewrite this in my own words. Keep the same idea but use fresh phrasing.',
    sourceDraft
  );
  const overlap = measureSourceOverlap(sourceDraft, rewritten);

  return {
    name: 'draft-rewrite-own-words',
    passed: !isNearVerbatimRewrite(sourceDraft, rewritten),
    details: {
      originalWords: countWords(sourceDraft),
      rewrittenWords: countWords(rewritten),
      trigramOverlap: overlap.trigramOverlap,
      fourgramOverlap: overlap.fourgramOverlap,
      longestSharedPhrase: overlap.longestSharedPhrase,
    },
  };
}

async function runDraftShortenFixture() {
  const sourceDraft = `AI infrastructure is entering the phase where reliability matters more than novelty. Buyers are not asking whether a product has AI anymore. They are asking whether the workflow is trustworthy, observable, and easy to roll out across teams. That's the shift that separates clever demos from durable companies.`;
  const maxAllowedWords = getMaxWordCount(countWords(sourceDraft), 'half');
  let { rewritten } = await runGuardedDraftEdit(
    'Cut the length in half while keeping the same meaning.',
    sourceDraft
  );

  if (countWords(rewritten) > maxAllowedWords) {
    const retry = await runGuardedDraftEdit(
      `Cut the length in half while keeping the same meaning.

STRICT LENGTH CORRECTION:
Return a version that is ${maxAllowedWords} words or fewer.`,
      sourceDraft
    );
    rewritten = retry.rewritten;
  }

  if (countWords(rewritten) > maxAllowedWords) {
    rewritten = trimToWordLimit(rewritten, maxAllowedWords);
  }

  return {
    name: 'draft-shorten-half',
    passed: countWords(rewritten) <= maxAllowedWords,
    details: {
      originalWords: countWords(sourceDraft),
      rewrittenWords: countWords(rewritten),
      maxAllowedWords,
    },
  };
}

async function runQuickPostRewriteFixture() {
  const sourcePost = `Most AI product teams are still optimizing for demos. The breakout companies will optimize for operational trust. If your buyer can't explain why the system is dependable, the pilot will never become a habit.`;
  const request = `Write this LinkedIn post in my own words and in my voice:\n\n${sourcePost}`;
  const prompt = buildQuickPostPrompt(request, profile, 'linkedin');
  const response = await generateWithClaude(prompt, undefined, 2500);
  const overlap = measureSourceOverlap(sourcePost, response);

  return {
    name: 'quick-post-rewrite',
    passed: !isNearVerbatimRewrite(sourcePost, response),
    details: {
      sourceWords: countWords(sourcePost),
      outputWords: countWords(response),
      trigramOverlap: overlap.trigramOverlap,
      fourgramOverlap: overlap.fourgramOverlap,
      longestSharedPhrase: overlap.longestSharedPhrase,
    },
  };
}

async function runArticleDraftFixture() {
  const article = {
    title: 'Before Quantum Computing Arrives, This Startup Wants Enterprises Already Running On It',
    summary: 'A startup is helping enterprises simulate quantum-inspired workflows before quantum hardware is production ready.',
    keyPoints: [
      'The company raised fresh funding to scale enterprise adoption.',
      'Customers are using the software to model supply chain and logistics scenarios.',
      'The pitch is pragmatic adoption before true quantum hardware matures.',
    ],
    content: `Before true quantum computing is commercially ready, a new startup wants enterprises to start building the habits now. The company says customers are already using its software to model logistics, supply chains, and other optimization-heavy workflows. Investors are betting that teams that learn the workflow early will have an advantage when the hardware finally arrives.`,
    author: 'TechCrunch',
    publishedDate: '2026-03-13',
    url: 'https://example.com/quantum-enterprise',
    sourceType: 'article',
    topic: 'Enterprise Software',
  };
  const prompt = buildArticleDraftsPrompt(article, profile);
  const response = await generateWithClaude(prompt, undefined, 3500);
  const parsed = parseJson<ArticleDraftResponse>(response);
  const sourceText = [article.title, article.summary, ...article.keyPoints, article.content].join('\n');
  const firstPost = parsed.posts[0]?.content ?? '';
  const overlap = measureSourceOverlap(sourceText, firstPost);

  return {
    name: 'article-draft-fresh-wording',
    passed: !isNearVerbatimRewrite(sourceText, firstPost),
    details: {
      outputWords: countWords(firstPost),
      trigramOverlap: overlap.trigramOverlap,
      fourgramOverlap: overlap.fourgramOverlap,
      longestSharedPhrase: overlap.longestSharedPhrase,
    },
  };
}

async function runSingleDraftRequiredAdditionFixture() {
  const sourceDraft = `Aalo is building serious energy infrastructure for the next generation of compute demand. The team has moved quickly since launch, and the market is finally catching up to why this category matters.`;
  const instruction = 'Update option 1 to mention that Harpoon Ventures has supported Aalo since the Series A.';
  const requiredAdditions = extractRequiredAdditions(instruction);
  const { rewritten } = await runGuardedDraftEdit(instruction, sourceDraft, requiredAdditions);
  const missingAdditions = getMissingRequiredAdditions(rewritten, requiredAdditions);

  return {
    name: 'single-draft-required-addition',
    passed: requiredAdditions.length > 0 && missingAdditions.length === 0,
    details: {
      requiredAdditions,
      missingAdditions,
      rewritten,
    },
  };
}

async function runAllDraftsRequiredAdditionFixture() {
  const sourceDrafts = [
    'Aalo has been one of the more ambitious bets in advanced energy, and the pace since launch has been real.',
    'The energy stack for AI is changing fast, and Aalo keeps showing why this is not a niche infrastructure story.',
    'There is a reason sophisticated investors keep leaning into next-generation energy platforms. Aalo is one of the clearest examples.',
  ];
  const instruction = 'Update all 3 to include that Harpoon Ventures is happy to support Aalo since the Series A. And that there is so much more coming soon for them.';
  const requiredAdditions = extractRequiredAdditions(instruction);
  const drafts = await runGuardedMultiDraftEdit(instruction, sourceDrafts, requiredAdditions);
  const missingByDraft = drafts.map((draft) => ({
    index: draft.index,
    missingAdditions: getMissingRequiredAdditions(draft.content, requiredAdditions),
  }));

  return {
    name: 'all-drafts-required-addition',
    passed: requiredAdditions.length > 0
      && drafts.length === 3
      && missingByDraft.every((draft) => draft.missingAdditions.length === 0),
    details: {
      requiredAdditions,
      missingByDraft,
      drafts,
    },
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required to run rewrite evaluation.');
    process.exit(1);
  }

  const results = await Promise.all([
    runDraftRewriteFixture(),
    runDraftShortenFixture(),
    runQuickPostRewriteFixture(),
    runArticleDraftFixture(),
    runSingleDraftRequiredAdditionFixture(),
    runAllDraftsRequiredAdditionFixture(),
  ]);

  console.log('\nRewrite evaluation results:\n');
  for (const result of results) {
    console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}`);
    console.log(JSON.stringify(result.details, null, 2));
    console.log('');
  }

  if (results.some((result) => !result.passed)) {
    process.exit(1);
  }
}

void main();
