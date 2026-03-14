import { NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/claude/client';
import { normalizeTopicLabels } from '@/lib/topics';

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
      network_building: 'Connect with like-minded professionals',
      attract_clients_customers: 'Attract ideal clients or customers by showing clear value',
      educate_network: 'Teach their audience useful ideas and explain their space clearly',
      recruiting: 'Attract top talent',
      brand_awareness: 'Increase visibility for their company, work, or perspective',
    };

    const goalText = goals.map(g => goalDescriptions[g] || g).join(', ');

    const prompt = `Someone is setting up a professional content creation profile. Based on who they are and what they want to achieve, suggest 8-10 broad topic labels they should post about.

WHO THEY ARE:
${jobDescription}

THEIR GOALS:
${goalText}

Rules for topic labels:
- BROAD: Prefer umbrella categories they can reuse across many posts
- SHORT: 1-3 words maximum, like "AI", "Biotech", "VC Investing", "Company Building"
- NOT full sentences or descriptions
- Avoid narrow angles like "Founder Hiring Mistakes" or "Climate Tech Funding"
- Avoid over-qualifying with words like "enterprise", "thesis", "evaluation", "portfolio", or "due diligence" unless absolutely necessary
- Prefer "AI Adoption" over "Enterprise AI Adoption"
- Prefer "Venture Investing" over "Venture Due Diligence"
- Specific enough to be meaningful, but still general enough to be a reusable content pillar
- Relevant to their background and goals
- A mix of core expertise and adjacent areas that would attract their target audience

Example output: ["AI", "Biotech", "VC Investing", "Company Building", "Leadership", "Enterprise Software", "Startups", "Hiring"]

Return ONLY a valid JSON array of short label strings, no other text.`;

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

    const normalizedTopics = normalizeTopicLabels(topics).slice(0, 10);

    return NextResponse.json({ topics: normalizedTopics });
  } catch (error) {
    console.error('Topic suggestion error:', error);
    return NextResponse.json({ error: 'Failed to suggest topics' }, { status: 500 });
  }
}
