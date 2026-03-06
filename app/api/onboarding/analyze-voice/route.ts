import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateWithClaude } from '@/lib/claude/client';
import {
  buildVoiceAnalysisPrompt,
  buildStyleBiblePrompt,
  RewritePair,
} from '@/lib/claude/prompts/voice-analysis';

function parseJsonResponse(response: string): unknown {
  let jsonString = response.trim();
  // Strip markdown code fences if present
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(jsonString);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { posts, rewritePairs, jobDescription } = await req.json() as {
      posts: string[];
      rewritePairs?: RewritePair[];
      jobDescription?: string;
    };

    if (!posts || posts.length < 5) {
      return NextResponse.json(
        { error: 'At least 5 posts required for analysis' },
        { status: 400 }
      );
    }

    // Run structured analysis and Style Bible generation in parallel
    const analysisPrompt = buildVoiceAnalysisPrompt(posts, rewritePairs);

    let analysis: Record<string, unknown> | null = null;
    let styleBible: string | null = null;

    // First: structured analysis
    try {
      const analysisResponse = await generateWithClaude(analysisPrompt);
      analysis = parseJsonResponse(analysisResponse) as Record<string, unknown>;
    } catch (parseError) {
      console.error('Voice analysis JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Voice analysis produced an invalid response. Please try again.' },
        { status: 502 }
      );
    }

    // Second: Style Bible (uses the structured analysis as context)
    try {
      const styleBiblePrompt = buildStyleBiblePrompt(
        posts,
        rewritePairs,
        jobDescription,
        analysis || undefined
      );
      styleBible = await generateWithClaude(styleBiblePrompt);
    } catch (error) {
      console.error('Style Bible generation error:', error);
      // Style Bible is optional — structured analysis alone is still valuable
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
