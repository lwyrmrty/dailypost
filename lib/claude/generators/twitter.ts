import { generateWithClaude } from '../client';
import { VoiceProfile } from '@/lib/db/schema';
import { buildVoiceGuidelines } from '../prompts/voice-analysis';

interface XPostResult {
  isThread: boolean;
  content: string;
  threadBreakdown?: string[];
}

export async function generateXFromIdea(
  idea: string,
  profile: Partial<VoiceProfile>,
  preferThread: boolean = false
): Promise<XPostResult> {
  const voiceGuidelines = buildVoiceGuidelines(
    profile.voiceAnalysis as Record<string, unknown> || {}
  );

  const prompt = `
Write ${preferThread ? 'an X thread' : 'an X post'} for a ${profile.jobDescription || 'professional'}.

IDEA/TOPIC: ${idea}

VOICE GUIDELINES: ${voiceGuidelines}

X BEST PRACTICES:
${preferThread ? `
- Thread format: 5-10 tweets
- First tweet must hook and work standalone
- Number tweets: "1/7", "2/7", etc.
- Each tweet under 280 characters
- End with strong CTA or summary
` : `
- Single tweet under 280 characters
- Punchy, direct, memorable
- No fluff
`}

Return JSON:
{
  "isThread": ${preferThread},
  "content": "main tweet or hook",
  "threadBreakdown": ["tweet 1", "tweet 2", ...] (if thread)
}
`.trim();

  const response = await generateWithClaude(prompt);
  
  try {
    return JSON.parse(response);
  } catch {
    return {
      isThread: false,
      content: response.slice(0, 280),
    };
  }
}

export async function convertLinkedInToThread(
  linkedInPost: string,
  profile: Partial<VoiceProfile>
): Promise<XPostResult> {
  const prompt = `
Convert this LinkedIn post into an X thread (5-10 tweets).

LINKEDIN POST:
${linkedInPost}

AUTHOR: ${profile.jobDescription || 'A professional'}

THREAD GUIDELINES:
- First tweet is the hook (must work standalone)
- Each tweet under 280 characters
- Number format: "1/7", "2/7"
- Punchier, more direct than LinkedIn
- End with CTA or summary tweet

Return JSON:
{
  "isThread": true,
  "content": "hook tweet",
  "threadBreakdown": ["1/N: hook", "2/N: point 1", ...]
}
`.trim();

  const response = await generateWithClaude(prompt);
  
  try {
    return JSON.parse(response);
  } catch {
    return {
      isThread: true,
      content: linkedInPost.slice(0, 280),
      threadBreakdown: [linkedInPost.slice(0, 280)],
    };
  }
}

export async function generateQuickTake(
  topic: string,
  profile: Partial<VoiceProfile>
): Promise<string> {
  const prompt = `
Write a punchy, single-tweet take on this topic.

TOPIC: ${topic}
AUTHOR: ${profile.jobDescription || 'A professional'}

Requirements:
- Under 280 characters
- Strong opinion or insight
- Match their voice
- No hashtags needed

Return ONLY the tweet text.
`.trim();

  const response = await generateWithClaude(prompt);
  return response.slice(0, 280);
}

export function validateXPost(content: string): {
  isValid: boolean;
  characterCount: number;
  issues: string[];
} {
  const issues: string[] = [];
  const characterCount = content.length;

  if (characterCount > 280) {
    issues.push(`Tweet is ${characterCount - 280} characters over the limit.`);
  }

  if (characterCount < 20) {
    issues.push('Tweet is too short to be engaging.');
  }

  return {
    isValid: issues.length === 0,
    characterCount,
    issues,
  };
}

export function splitIntoThread(longContent: string, maxTweetLength: number = 270): string[] {
  const sentences = longContent.split(/(?<=[.!?])\s+/);
  const tweets: string[] = [];
  let currentTweet = '';

  for (const sentence of sentences) {
    if ((currentTweet + ' ' + sentence).trim().length <= maxTweetLength) {
      currentTweet = (currentTweet + ' ' + sentence).trim();
    } else {
      if (currentTweet) {
        tweets.push(currentTweet);
      }
      currentTweet = sentence;
    }
  }

  if (currentTweet) {
    tweets.push(currentTweet);
  }

  // Add numbering
  const total = tweets.length;
  return tweets.map((tweet, i) => `${i + 1}/${total}: ${tweet}`);
}






