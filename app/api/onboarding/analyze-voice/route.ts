import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateWithClaude } from '@/lib/claude/client';
import {
  buildVoiceAnalysisPrompt,
  buildStyleBiblePrompt,
  PostTypePreference,
  RewritePair,
  VoiceDiscoveryData,
} from '@/lib/claude/prompts/voice-analysis';

const MAX_POSTS = 8;
const MAX_REWRITE_PAIRS = 3;
const MAX_POST_CHARS = 1800;
const MAX_REWRITE_CHARS = 1200;
const MAX_TOTAL_POST_CHARS = 12000;
const ANALYSIS_MAX_TOKENS = 4500;
const STYLE_BIBLE_MAX_TOKENS = 2500;

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

function preparePosts(posts: string[]): string[] {
  const prepared: string[] = [];
  let totalChars = 0;

  for (const rawPost of posts) {
    const post = truncateText(rawPost.trim(), MAX_POST_CHARS);
    if (!post) continue;
    if (prepared.length >= MAX_POSTS) break;
    if (totalChars + post.length > MAX_TOTAL_POST_CHARS) break;
    prepared.push(post);
    totalChars += post.length;
  }

  return prepared;
}

function prepareRewritePairs(rewritePairs?: RewritePair[]): RewritePair[] | undefined {
  if (!rewritePairs?.length) return undefined;

  return rewritePairs.slice(0, MAX_REWRITE_PAIRS).map((pair) => ({
    ...pair,
    original: truncateText(pair.original.trim(), MAX_REWRITE_CHARS),
    rewrite: truncateText(pair.rewrite.trim(), MAX_REWRITE_CHARS),
  }));
}

function extractJsonText(response: string): string {
  let jsonString = response.trim();
  // Strip markdown code fences if present
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

function parseJsonResponse(response: string): unknown {
  return JSON.parse(extractJsonText(response));
}

async function repairJsonResponse(response: string): Promise<Record<string, unknown> | null> {
  try {
    const repaired = await generateWithClaude(
      `You will be given a response that was supposed to be valid JSON but may include formatting mistakes or extra prose.

Convert it into a valid JSON object.

Rules:
- Return ONLY valid JSON
- Do not change the meaning
- Preserve all keys and values
- Remove any markdown fences or commentary

Response to repair:
${response}`,
      undefined,
      2500
    );

    return parseJsonResponse(repaired) as Record<string, unknown>;
  } catch (error) {
    console.error('Voice analysis JSON repair failed:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { posts, rewritePairs, jobDescription, voiceDiscovery, postTypeRatings } = await req.json() as {
      posts: string[];
      rewritePairs?: RewritePair[];
      jobDescription?: string;
      voiceDiscovery?: VoiceDiscoveryData;
      postTypeRatings?: PostTypePreference[];
    };

    if (!posts || posts.length < 5) {
      return NextResponse.json(
        { error: 'At least 5 posts required for analysis' },
        { status: 400 }
      );
    }

    const preparedPosts = preparePosts(posts);
    const preparedRewritePairs = prepareRewritePairs(rewritePairs);

    console.info('Voice analysis request:', {
      originalPostCount: posts.length,
      preparedPostCount: preparedPosts.length,
      originalChars: posts.reduce((sum, post) => sum + post.length, 0),
      preparedChars: preparedPosts.reduce((sum, post) => sum + post.length, 0),
      rewritePairCount: preparedRewritePairs?.length ?? 0,
      postTypeRatingCount: postTypeRatings?.length ?? 0,
    });

    if (preparedPosts.length < 5) {
      return NextResponse.json(
        { error: 'Please provide 5 shorter posts or excerpts for analysis.' },
        { status: 400 }
      );
    }

    // Keep prompts bounded so long-form writing samples do not overflow the model context.
    const analysisPrompt = buildVoiceAnalysisPrompt(
      preparedPosts,
      preparedRewritePairs,
      voiceDiscovery,
      postTypeRatings
    );
    const styleBiblePrompt = buildStyleBiblePrompt(
      preparedPosts,
      preparedRewritePairs,
      jobDescription,
      undefined,
      voiceDiscovery,
      postTypeRatings
    );

    // Run both Claude calls in parallel to cut total time roughly in half
    const [analysisResult, styleBibleResult] = await Promise.allSettled([
      generateWithClaude(analysisPrompt, undefined, ANALYSIS_MAX_TOKENS),
      generateWithClaude(styleBiblePrompt, undefined, STYLE_BIBLE_MAX_TOKENS),
    ]);

    let analysis: Record<string, unknown> | null = null;
    let styleBible: string | null = null;

    if (analysisResult.status === 'fulfilled') {
      try {
        analysis = parseJsonResponse(analysisResult.value) as Record<string, unknown>;
      } catch (parseError) {
        console.error('Voice analysis JSON parse error:', parseError);
        console.error('Voice analysis raw preview:', analysisResult.value.slice(0, 1000));

        const repairedAnalysis = await repairJsonResponse(analysisResult.value);
        if (!repairedAnalysis) {
          return NextResponse.json(
            { error: 'Voice analysis produced an invalid response. Please try again.' },
            { status: 502 }
          );
        }

        analysis = repairedAnalysis;
      }
    } else {
      console.error('Voice analysis Claude call failed:', analysisResult.reason);
      return NextResponse.json(
        { error: 'Voice analysis failed. Please try again.' },
        { status: 502 }
      );
    }

    if (styleBibleResult.status === 'fulfilled') {
      styleBible = styleBibleResult.value;
    } else {
      // Style Bible is optional — structured analysis alone is still valuable
      console.error('Style Bible generation error:', styleBibleResult.reason);
    }

    return NextResponse.json({
      analysis,
      styleBible,
    });
  } catch (error) {
    console.error('Voice analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze voice' },
      { status: 500 }
    );
  }
}
