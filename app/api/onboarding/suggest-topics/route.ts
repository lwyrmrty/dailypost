import { NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/claude/client';

export async function POST(req: Request) {
  try {
    const { jobDescription, goals } = await req.json() as {
      jobDescription: string;
      goals: string[];
    };

    if (!jobDescription || !goals || goals.length === 0) {
      return NextResponse.json({ error: 'Job description and at least one goal required' }, { status: 400 });
    }

    const goalDescriptions: Record<string, string> = {
      thought_leadership: 'Establish expertise and share original insights',
      deal_flow: 'Attract investment opportunities or partnerships',
      network_building: 'Connect with like-minded professionals',
      portfolio_support: 'Support and amplify portfolio companies',
      recruiting: 'Attract top talent',
      brand_awareness: 'Increase visibility for their company or fund',
    };

    const goalText = goals.map(g => goalDescriptions[g] || g).join(', ');

    const prompt = `Someone is setting up a professional content creation profile. Based on who they are and what they want to achieve, suggest 6-8 specific topics they should post about.

WHO THEY ARE:
${jobDescription}

THEIR GOALS:
${goalText}

Return a JSON array of topic strings. Topics should be:
- Specific enough to be actionable (not just "Technology")
- Relevant to their background and goals
- A mix of their core expertise and adjacent areas that would attract their target audience
- Can be anything — don't limit yourself to predefined categories

Example format: ["Venture Capital Trends", "AI in Enterprise", "Climate Tech Funding", ...]

Return ONLY a valid JSON array of strings, no other text.`;

    const response = await generateWithClaude(prompt);

    let topics: string[];
    try {
      let jsonString = response.trim();
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      topics = JSON.parse(jsonString);
      if (!Array.isArray(topics)) throw new Error('Not an array');
    } catch {
      return NextResponse.json({ error: 'Failed to parse topic suggestions' }, { status: 502 });
    }

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Topic suggestion error:', error);
    return NextResponse.json({ error: 'Failed to suggest topics' }, { status: 500 });
  }
}
