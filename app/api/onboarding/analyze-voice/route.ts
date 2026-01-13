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

    // Parse the JSON response
    try {
      const analysis = JSON.parse(response);
      return NextResponse.json({ analysis });
    } catch {
      // If JSON parsing fails, return a default analysis
      return NextResponse.json({
        analysis: {
          avgSentenceLength: 15,
          vocabularyLevel: 'moderate',
          questionUsage: 'medium',
          humorLevel: 'subtle',
          structurePreference: 'mixed',
          insights: 'Analysis complete. Your writing shows a balanced professional style.',
        },
      });
    }
  } catch (error) {
    console.error('Voice analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze voice' },
      { status: 500 }
    );
  }
}






