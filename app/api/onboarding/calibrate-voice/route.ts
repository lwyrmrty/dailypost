import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateWithClaude } from '@/lib/claude/client';
import { buildCalibrationPrompt } from '@/lib/claude/prompts/voice-analysis';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { styleBible, topic, platform } = await req.json() as {
      styleBible: string;
      topic: string;
      platform: 'linkedin' | 'x';
    };

    if (!styleBible) {
      return NextResponse.json(
        { error: 'Style Bible required for calibration' },
        { status: 400 }
      );
    }

    const prompt = buildCalibrationPrompt(styleBible, topic, platform);
    const response = await generateWithClaude(prompt);

    let jsonString = response.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
      const parsed = JSON.parse(jsonString);
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
