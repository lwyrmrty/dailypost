import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateWithClaude } from '@/lib/claude/client';
import { buildCalibrationPrompt, PostTypePreference } from '@/lib/claude/prompts/voice-analysis';

const CALIBRATION_MAX_TOKENS = 8000;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { styleBible, topic, platform, postTypeRatings, feedback } = await req.json() as {
      styleBible: string;
      topic: string;
      platform: 'linkedin' | 'x';
      postTypeRatings?: PostTypePreference[];
      feedback?: Array<{
        content: string;
        rating: 'not_accurate' | 'good' | 'great';
        postType?: string;
      }>;
    };

    if (!styleBible) {
      return NextResponse.json(
        { error: 'Style Bible required for calibration' },
        { status: 400 }
      );
    }

    const prompt = buildCalibrationPrompt(styleBible, topic, platform, postTypeRatings, feedback);
    const response = await generateWithClaude(prompt, undefined, CALIBRATION_MAX_TOKENS);

    let jsonString = response.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.versions)) {
        throw new Error('Missing versions array');
      }
      return NextResponse.json({ versions: parsed.versions });
    } catch {
      console.error('Calibration JSON parse error, raw:', response.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to generate calibration posts. Please try again.' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Voice calibration error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calibration posts' },
      { status: 500 }
    );
  }
}
