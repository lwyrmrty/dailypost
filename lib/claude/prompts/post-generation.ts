import { VoiceProfile } from '@/lib/db/schema';
import { buildVoiceGuidelines, selectFewShotExamples } from './voice-analysis';

interface NewsStory {
  title: string;
  summary: string;
  url: string;
  topic?: string;
}

/**
 * Build the voice instruction section, preferring the Style Bible over structured guidelines.
 * The Style Bible is a rich narrative document; structured guidelines are a fallback.
 */
function buildVoiceSection(profile: Partial<VoiceProfile>): string {
  const styleBible = profile.styleBible as string | null;
  if (styleBible) {
    return `STYLE BIBLE (your primary reference for this person's voice):
${styleBible}`;
  }

  // Fallback to structured voice guidelines
  const voiceGuidelines = buildVoiceGuidelines(
    profile.voiceAnalysis as Record<string, unknown> || {}
  );
  return `VOICE GUIDELINES:
${voiceGuidelines}`;
}

function buildWritingSamplesSection(profile: Partial<VoiceProfile>, platform: 'linkedin' | 'x'): string {
  const examples = selectFewShotExamples(
    profile.samplePosts as string[] | null,
    profile.uploadedContent as string[] | null,
    3,
    platform
  );

  if (examples.length === 0) return '';

  return `
WRITING SAMPLES (study these carefully — they ARE the voice you must match):
${examples.map((ex, i) => `\n--- Example ${i + 1} ---\n${ex}`).join('\n')}

These samples are the ground truth for this person's voice. Match their sentence structure, word choices, rhythm, and personality precisely.`;
}

function buildPerspectivesSection(profile: Partial<VoiceProfile>, storyTopic?: string): string {
  const perspectives = profile.topicPerspectives as Array<{ topic: string; perspective: string }> | null;
  if (!perspectives || perspectives.length === 0) return '';

  // Find relevant perspective for this topic
  const relevant = storyTopic
    ? perspectives.find(p =>
        p.topic.toLowerCase().includes(storyTopic.toLowerCase()) ||
        storyTopic.toLowerCase().includes(p.topic.toLowerCase())
      )
    : null;

  const section = ['UNIQUE PERSPECTIVES (incorporate these viewpoints where relevant):'];

  if (relevant) {
    section.push(`MOST RELEVANT — On "${relevant.topic}": ${relevant.perspective}`);
  }

  // Include other perspectives for general context
  const others = perspectives.filter(p => p !== relevant).slice(0, 3);
  for (const p of others) {
    section.push(`On "${p.topic}": ${p.perspective}`);
  }

  return section.join('\n');
}

function buildInspirationSection(profile: Partial<VoiceProfile>): string {
  const accounts = profile.inspirationAccounts as Array<{
    platform: string;
    url: string;
    whatYouLike: string;
  }> | null;

  if (!accounts || accounts.length === 0) return '';

  return `
STYLE INSPIRATION (qualities to channel):
${accounts.map(a => `- What they admire: "${a.whatYouLike}"`).join('\n')}`;
}

function buildToneSection(profile: Partial<VoiceProfile>): string {
  const tonePrefs = profile.tonePreferences as Record<string, unknown> | null;
  if (!tonePrefs) return 'Tone: professional yet conversational';

  const blend = tonePrefs.blend as Record<string, number> | undefined;
  if (blend) {
    const entries = Object.entries(blend)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);
    if (entries.length > 0) {
      return `Tone blend: ${entries.map(([tone, pct]) => `${pct}% ${tone}`).join(' / ')}`;
    }
  }

  return `Tone: Primary: ${tonePrefs.primary || 'professional'}, Secondary: ${tonePrefs.secondary || 'conversational'}`;
}

export function buildLinkedInPostPrompt(
  story: NewsStory,
  profile: Partial<VoiceProfile>
): string {
  const voiceSection = buildVoiceSection(profile);

  const preferredTypes = (profile.postTypeRatings as Array<{ type: string; rating: number }> || [])
    .filter(r => r.rating >= 4)
    .map(r => r.type)
    .join(', ');

  const writingSamples = buildWritingSamplesSection(profile, 'linkedin');
  const perspectives = buildPerspectivesSection(profile, story.topic);
  const inspiration = buildInspirationSection(profile);
  const toneSection = buildToneSection(profile);

  return `
You are a ghostwriter who has deeply studied this person's writing and must produce content indistinguishable from their own. You are NOT writing generic "LinkedIn content" — you are writing as THIS specific person.

ABOUT THE AUTHOR:
"${profile.jobDescription || 'A professional in their field'}"

${voiceSection}
${writingSamples}

CONTENT PROFILE:
- Topics of interest: ${(profile.primaryTopics || []).join(', ')}
- Topics to avoid: ${(profile.avoidTopics || []).join(', ')}
- ${toneSection}
- Preferred post types: ${preferredTypes || 'news_commentary, hot_take'}
${perspectives ? `\n${perspectives}` : ''}
${inspiration ? `\n${inspiration}` : ''}

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
1. Write EXACTLY like this person — match their rhythm, word choices, sentence patterns, and quirks. Re-read the writing samples and voice guidelines before writing.
2. Choose ONE post type from their preferences
3. Match their tone blend precisely
4. Include specific insights from the story (don't just summarize)
5. Add a distinctive perspective — what's the implication? What's the insight others are missing?
6. Make it engaging for professionals in this space
7. Do NOT use the phrase "hot take" or explicitly label the post type
8. NEVER use em dashes (—) anywhere in the content. Use commas, periods, or other punctuation instead.
9. If they have relevant topic perspectives, weave those viewpoints naturally into the post

Generate a LinkedIn post that sounds like THEM, not generic AI writing. Return ONLY the post content, no explanations.
`.trim();
}

export function buildXPostPrompt(
  story: NewsStory,
  profile: Partial<VoiceProfile>
): string {
  const voiceSection = buildVoiceSection(profile);

  const writingSamples = buildWritingSamplesSection(profile, 'x');
  const perspectives = buildPerspectivesSection(profile, story.topic);
  const tonePrefs = profile.tonePreferences as Record<string, unknown> || {};

  // Check for platform-specific adaptation notes
  const analysis = profile.voiceAnalysis as Record<string, unknown> | undefined;
  const platformNotes = analysis?.platformAdaptation as Record<string, string> | undefined;
  const xStyleNote = platformNotes?.twitterStyle || '';

  return `
You are a ghostwriter who has deeply studied this person's writing. Adapt their voice for X/Twitter — punchier and faster-paced, but still unmistakably THEM.

ABOUT THE AUTHOR:
"${profile.jobDescription || 'A professional in their field'}"

${voiceSection}
${writingSamples}
${xStyleNote ? `\nX/TWITTER ADAPTATION: ${xStyleNote}` : ''}

CONTENT PROFILE:
- Topics of interest: ${(profile.primaryTopics || []).join(', ')}
- Topics to avoid: ${(profile.avoidTopics || []).join(', ')}
- Tone: ${tonePrefs.primary || 'conversational'}
${perspectives ? `\n${perspectives}` : ''}

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
1. Sound like THIS person, just adapted for X's punchier culture
2. Decide: standalone tweet OR thread based on story complexity
3. If thread: Hook in first tweet, expand in subsequent tweets
4. Can be more provocative/contrarian than LinkedIn
5. Match their voice quirks, humor style, and personality
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
  const voiceSection = buildVoiceSection(profile);

  const writingSamples = buildWritingSamplesSection(profile, platform);
  const perspectives = buildPerspectivesSection(profile, topic);

  const platformGuidelines = platform === 'linkedin'
    ? 'Write a professional LinkedIn post (1300-2000 characters). Use line breaks, include 3-5 hashtags, end with engagement hook.'
    : 'Write for X/Twitter. Keep it punchy (under 280 characters for single tweet, or create a thread for complex topics).';

  return `
You are a ghostwriter who has deeply studied this person's writing. Write as THEM, not as a generic AI.

ABOUT THE AUTHOR:
"${profile.jobDescription || 'A professional'}"

TOPIC/IDEA: ${topic}

${voiceSection}
${writingSamples}
${perspectives ? `\n${perspectives}` : ''}

PLATFORM GUIDELINES: ${platformGuidelines}

IMPORTANT: NEVER use em dashes (—) anywhere in the content. Use commas, periods, or other punctuation instead.

Write content that is indistinguishable from this person's own writing. Match their rhythm, word choices, and personality. Return only the post content${platform === 'x' ? ' as JSON with isThread, content, and threadBreakdown fields' : ''}.
`.trim();
}
