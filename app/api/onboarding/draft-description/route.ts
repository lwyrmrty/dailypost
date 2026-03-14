import { NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/claude/client';

export async function POST(req: Request) {
  try {
    const { role, focus, differentiator } = await req.json() as {
      role: string;
      focus: string;
      differentiator?: string;
    };

    if (!role || !focus) {
      return NextResponse.json({ error: 'Role and focus are required' }, { status: 400 });
    }

    const prompt = `Write a 1-2 sentence professional description for someone's content creation profile. It should sound natural and specific — like something they'd say introducing themselves at a conference, not a LinkedIn headline.

Their details:
- Role / title: ${role}
- What they focus on: ${focus}
${differentiator ? `- What makes their perspective distinctive: ${differentiator}` : ''}

Rules:
- 1-2 sentences maximum
- First person ("I'm a..." or "I lead...")
- Specific and concrete — include their focus areas
- If a differentiator was given, weave it in naturally
- No buzzwords or filler phrases like "passionate about" or "results-driven"
- Don't start with "I am" — use contractions ("I'm")

Return ONLY the description text, nothing else.`;

    const description = await generateWithClaude(prompt);

    return NextResponse.json({ description: description.trim() });
  } catch (error) {
    console.error('Description draft error:', error);
    return NextResponse.json({ error: 'Failed to draft description' }, { status: 500 });
  }
}
