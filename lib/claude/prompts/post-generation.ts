import { VoiceProfile } from '@/lib/db/schema';
import { buildVoiceGuidelines } from './voice-analysis';

interface NewsStory {
  title: string;
  summary: string;
  url: string;
  topic?: string;
}

export function buildLinkedInPostPrompt(
  story: NewsStory,
  profile: Partial<VoiceProfile>
): string {
  const voiceGuidelines = buildVoiceGuidelines(
    profile.voiceAnalysis as Record<string, unknown> || {}
  );

  const preferredTypes = (profile.postTypeRatings as Array<{ type: string; rating: number }> || [])
    .filter(r => r.rating >= 4)
    .map(r => r.type)
    .join(', ');

  const tonePrefs = profile.tonePreferences as Record<string, unknown> || {};

  return `
You are writing a LinkedIn post for someone with this background:
"${profile.jobDescription || 'A professional in their field'}"

VOICE PROFILE:
- Topics of interest: ${(profile.primaryTopics || []).join(', ')}
- Topics to avoid: ${(profile.avoidTopics || []).join(', ')}
- Tone preferences: Primary: ${tonePrefs.primary || 'professional'}, Secondary: ${tonePrefs.secondary || 'conversational'}
- Preferred post types: ${preferredTypes || 'news_commentary, hot_take'}
- Voice guidelines: ${voiceGuidelines}

NEWS STORY TO COMMENT ON:
Title: ${story.title}
Summary: ${story.summary}
URL: ${story.url}
Topic: ${story.topic || 'General'}

LINKEDIN BEST PRACTICES:
- Length: 1300-2000 characters (optimal for engagement)
- Hook: First 2 lines must grab attention (appears before "see more")
- Formatting: Use line breaks every 1-2 sentences for readability
- Hashtags: Include 3-5 relevant hashtags at the end
- Engagement: End with a question or call-to-action

REQUIREMENTS:
1. Write in this person's authentic voice (match their patterns and style)
2. Choose ONE post type from their preferences
3. Match their tone blend
4. Include specific insights from the story (don't just summarize)
5. Add YOUR perspective - what's the implication? What's the insight?
6. Make it engaging for professionals in this space
7. Do NOT use the phrase "hot take" or explicitly label the post type
8. NEVER use em dashes (—) anywhere in the content. Use commas, periods, or other punctuation instead.

Generate a LinkedIn post that sounds like THEM, not generic AI writing. Return ONLY the post content, no explanations.
`.trim();
}

export function buildXPostPrompt(
  story: NewsStory,
  profile: Partial<VoiceProfile>
): string {
  const voiceGuidelines = buildVoiceGuidelines(
    profile.voiceAnalysis as Record<string, unknown> || {}
  );

  const tonePrefs = profile.tonePreferences as Record<string, unknown> || {};

  return `
You are writing X (Twitter) content for someone with this background:
"${profile.jobDescription || 'A professional in their field'}"

VOICE PROFILE:
- Topics of interest: ${(profile.primaryTopics || []).join(', ')}
- Topics to avoid: ${(profile.avoidTopics || []).join(', ')}
- Tone: ${tonePrefs.primary || 'conversational'}
- Voice guidelines: ${voiceGuidelines}

NEWS STORY:
Title: ${story.title}
Summary: ${story.summary}
URL: ${story.url}

X BEST PRACTICES:
- Standalone tweet: 100-250 characters, punchy and direct
- Thread: 5-10 tweets max, first tweet must work standalone
- Formatting: Short sentences, line breaks for impact
- For threads: Use "1/7" format numbering
- Ending: Strong CTA or provocative question

REQUIREMENTS:
1. Decide: standalone tweet OR thread based on story complexity
2. If thread: Hook in first tweet, expand in subsequent tweets
3. Be punchier and faster-paced than LinkedIn
4. Can be more provocative/contrarian
5. Match their voice but adapt for X's culture
6. NEVER use em dashes (—) anywhere. Use commas, periods, or other punctuation instead.

Return JSON:
{
  "isThread": boolean,
  "content": "full text for standalone OR first tweet",
  "threadBreakdown": ["tweet 1", "tweet 2", ...] (only if thread, include all tweets)
}

Return ONLY valid JSON, no other text.
`.trim();
}

export function buildQuickPostPrompt(
  topic: string,
  profile: Partial<VoiceProfile>,
  platform: 'linkedin' | 'x'
): string {
  const voiceGuidelines = buildVoiceGuidelines(
    profile.voiceAnalysis as Record<string, unknown> || {}
  );

  const platformGuidelines = platform === 'linkedin'
    ? 'Write a professional LinkedIn post (1300-2000 characters). Use line breaks, include 3-5 hashtags, end with engagement hook.'
    : 'Write for X/Twitter. Keep it punchy (under 280 characters for single tweet, or create a thread for complex topics).';

  return `
You are writing ${platform === 'linkedin' ? 'a LinkedIn post' : 'an X post'} for:
"${profile.jobDescription || 'A professional'}"

TOPIC/IDEA: ${topic}

VOICE GUIDELINES: ${voiceGuidelines}

PLATFORM GUIDELINES: ${platformGuidelines}

IMPORTANT: NEVER use em dashes (—) anywhere in the content. Use commas, periods, or other punctuation instead.

Write content that sounds authentic to this person's voice. Return only the post content${platform === 'x' ? ' as JSON with isThread, content, and threadBreakdown fields' : ''}.
`.trim();
}





