import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateWithClaude } from '@/lib/claude/client';
import { buildVoiceAnalysisPrompt } from '@/lib/claude/prompts/voice-analysis';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { posts } = await req.json();

    if (!posts || posts.length < 5) {
      return NextResponse.json(
        { error: 'At least 5 posts required for analysis' },
        { status: 400 }
      );
    }

    const prompt = buildVoiceAnalysisPrompt(posts);
    const response = await generateWithClaude(prompt);

    // Try to parse JSON, handling potential markdown code blocks
    let jsonString = response.trim();
    // Strip markdown code fences if present
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
      const analysis = JSON.parse(jsonString);
      return NextResponse.json({ analysis });
    } catch (parseError) {
      console.error('Voice analysis JSON parse error:', parseError);
      console.error('Raw response:', response.slice(0, 500));
      return NextResponse.json(
        { error: 'Voice analysis produced an invalid response. Please try again.' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Voice analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze voice' },
      { status: 500 }
    );
  }
}
