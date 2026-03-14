import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { generateWithClaude } from '@/lib/claude/client';
import { buildFallbackTopicPrompt, normalizeTopicLabel } from '@/lib/topics';
import { eq } from 'drizzle-orm';

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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topic, priorPrompts } = await req.json() as {
      topic?: string;
      priorPrompts?: string[];
    };

    const normalizedTopic = normalizeTopicLabel(topic || '');
    if (!normalizedTopic) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 });
    }

    const promptHistory = (priorPrompts || []).filter(Boolean).slice(-6);

    const profile = await db.query.voiceProfiles.findFirst({
      where: eq(voiceProfiles.userId, session.user.id),
      columns: {
        jobDescription: true,
        postingGoals: true,
        primaryTopics: true,
      },
    });

    const prompt = `You are helping prepare a chat starter for a professional writing assistant.

Generate ONE short user prompt for the topic "${normalizedTopic}".

ABOUT THE USER:
${profile?.jobDescription || 'A professional building their public voice.'}

POSTING GOALS:
${(profile?.postingGoals || []).join(', ') || 'thought leadership'}

OTHER TOPIC PILLARS:
${(profile?.primaryTopics || []).join(', ') || normalizedTopic}

RECENT STARTERS FOR THIS SAME TOPIC:
${promptHistory.length ? promptHistory.map((item) => `- ${item}`).join('\n') : '- None yet'}

Rules:
- Return a prompt the user could send directly to the chat assistant
- It should be about ${normalizedTopic}, but pick a fresh angle
- Make it specific enough to inspire a strong post, but not so narrow that it feels forced
- Avoid repeating the same angle or phrasing from the recent starters
- Use first-person request phrasing like "Write me a post about..." or "Help me write a post on..."
- Keep it to one sentence
- Do not mention the user's goals explicitly unless natural

Return valid JSON in exactly this shape:
{ "prompt": "..." }

Return ONLY valid JSON.`;

    try {
      const response = await generateWithClaude(prompt, undefined, 300);
      const parsed = JSON.parse(extractJsonText(response)) as { prompt?: string };
      if (parsed.prompt?.trim()) {
        return NextResponse.json({ prompt: parsed.prompt.trim() });
      }
    } catch (error) {
      console.error('Failed to generate dashboard topic starter:', error);
    }

    return NextResponse.json({ prompt: buildFallbackTopicPrompt(normalizedTopic, promptHistory) });
  } catch (error) {
    console.error('Dashboard topic prompt error:', error);
    return NextResponse.json({ error: 'Failed to generate topic prompt' }, { status: 500 });
  }
}
