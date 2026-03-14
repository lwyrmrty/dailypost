import { VoiceProfile } from '@/lib/db/schema';
import { buildVoiceGuidelines, selectFewShotExamples } from './voice-analysis';

interface NewsStory {
  title: string;
  summary: string;
  url: string;
  topic?: string;
}

export interface ArticleDraftContext {
  title: string;
  summary: string;
  keyPoints: string[];
  content: string;
  author?: string;
  publishedDate?: string;
  url: string;
  sourceType: string;
  topic?: string;
}

export interface ArticleDraftResponse {
  intro: string;
  posts: Array<{
    platform: 'linkedin';
    content: string;
  }>;
  followUp: string;
}

export interface DraftEditResponse {
  reply: string;
  drafts: Array<{
    index: number;
    content: string;
  }>;
}

export interface ResearchBriefContext {
  query: string;
  summary: string;
  keyFindings: string[];
  sources: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
}

const TRAIT_LABELS: Record<string, string> = {
  bold_contrarian: 'Bold and contrarian — take strong, provocative positions',
  balanced_nuanced: 'Balanced and nuanced — acknowledge multiple sides thoughtfully',
  data_driven: 'Data-driven — lead with numbers, metrics, and evidence',
  narrative_storytelling: 'Storytelling — lead with narratives, anecdotes, and personal experiences',
  formal_polished: 'Polished and professional in tone',
  casual_conversational: 'Casual and conversational — write like talking to a smart friend',
  uses_humor: 'Use wit and humor naturally — dry observations, playful asides',
  straight_serious: 'Straightforward and serious — substance over style',
  concise_punchy: 'Concise and punchy — short sentences, one thought per line, get to the point',
  detailed_thorough: 'Detailed and thorough — develop ideas fully with examples',
  opinionated_declarative: 'Opinionated and declarative — make clear statements, no hedging',
  curious_socratic: 'Question-driven — explore ideas by asking questions, invite conversation',
};

/**
 * Build the voice instruction section, preferring the Style Bible over structured guidelines.
 * Falls back to voice discovery preferences for aspirational users with no writing samples.
 */
function buildVoiceSection(profile: Partial<VoiceProfile>): string {
  const styleBible = profile.styleBible as string | null;
  if (styleBible) {
    return `STYLE BIBLE (your primary reference for this person's voice):
${styleBible}`;
  }

  // Fallback to structured voice guidelines
  const voiceAnalysis = profile.voiceAnalysis as Record<string, unknown> | null;
  if (voiceAnalysis) {
    const voiceGuidelines = buildVoiceGuidelines(voiceAnalysis);
    return `VOICE GUIDELINES:
${voiceGuidelines}`;
  }

  // Last resort: voice discovery preferences (for aspirational users with no writing)
  const discovery = profile.voiceDiscovery as { picks?: Array<{ chosenTrait: string; confidence: string }> } | null;
  if (discovery?.picks && discovery.picks.length > 0) {
    const traits = discovery.picks
      .map(p => {
        const label = TRAIT_LABELS[p.chosenTrait] || p.chosenTrait;
        return p.confidence === 'strong' ? `- ${label}` : `- ${label} (slight preference)`;
      })
      .join('\n');

    return `VOICE PREFERENCES (this user is building their voice — match these aspirational preferences):
${traits}

Combine these preferences into a coherent, natural-sounding voice. Don't treat each as an isolated instruction — blend them into a unified persona.`;
  }

  return 'Write in a professional yet approachable tone.';
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
STYLE REFERENCE SAMPLES (study these to infer voice patterns, not to copy wording):
${examples.map((ex, i) => `\n--- Example ${i + 1} ---\n${ex}`).join('\n')}

Use these to understand cadence, level of specificity, perspective, and personality. Do NOT reuse phrases, sentence structures, or distinctive wording verbatim. Treat them as evidence of style, not templates to imitate line-by-line.`;
}

function buildAntiCopySection(sourceLabel: string) {
  return `
ANTI-COPYING RULES:
- Never lift phrases, sentences, or multi-sentence structure directly from the ${sourceLabel}.
- Use the facts, themes, and voice cues, but rewrite the language from scratch.
- If a reader could place your output side-by-side with the ${sourceLabel} and spot obvious borrowed wording, rewrite it again.
- Preserve meaning and voice, not surface phrasing.
`.trim();
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

const GOAL_FRAMING: Record<string, string> = {
  thought_leadership: 'Establish expertise — take clear, informed positions and share original insights',
  network_building: 'Build connections — be warm, invite dialogue, end with questions that draw people in',
  attract_clients_customers: 'Attract clients and customers — demonstrate value, reveal practical expertise, and make the next step feel natural',
  educate_network: 'Educate your network — break down ideas clearly, teach something useful, and leave the reader with a sharper understanding',
  recruiting: 'Attract talent — convey culture, mission, and what makes the work exciting',
  brand_awareness: 'Build visibility — create memorable content worth sharing and reinforce what you or your company stand for',
};

function buildGoalsSection(profile: Partial<VoiceProfile>): string {
  const goals = profile.postingGoals as string[] | null;
  if (!goals || goals.length === 0) return '';

  const lines = goals
    .map(g => GOAL_FRAMING[g])
    .filter(Boolean)
    .map(desc => `- ${desc}`);

  if (lines.length === 0) return '';

  return `POSTING INTENT (let these goals subtly shape the angle and framing):
${lines.join('\n')}`;
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
  const toneSection = buildToneSection(profile);
  const goalsSection = buildGoalsSection(profile);

  return `
You are a ghostwriter who has studied this person's writing patterns closely. Your job is to write something that feels authentically like them without copying their prior wording.

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
${goalsSection ? `\n${goalsSection}` : ''}

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
1. Capture this person's voice at the level of rhythm, specificity, conviction, and personality. Do not mimic any single sample too literally.
2. Choose ONE post type from their preferences
3. Match their tone blend faithfully
4. Include specific insights from the story (don't just summarize)
5. Add a distinctive perspective — what's the implication? What's the insight others are missing?
6. Make it engaging for professionals in this space
7. Do NOT use the phrase "hot take" or explicitly label the post type
8. NEVER use em dashes (—) anywhere in the content. Use commas, periods, or other punctuation instead.
9. If they have relevant topic perspectives, weave those viewpoints naturally into the post
10. Do not use markdown or unsupported platform formatting. No **bold**, *italic*, bullet lists, numbered lists, or heading markers. Use plain text plus line breaks only.

${buildAntiCopySection('writing samples and source story')}

Generate a LinkedIn post that sounds like THEM, not generic AI writing. Return ONLY the plain-text post content, no explanations.
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
  const goalsSection = buildGoalsSection(profile);

  // Check for platform-specific adaptation notes
  const analysis = profile.voiceAnalysis as Record<string, unknown> | undefined;
  const platformNotes = analysis?.platformAdaptation as Record<string, string> | undefined;
  const xStyleNote = platformNotes?.twitterStyle || '';

  return `
You are a ghostwriter who has studied this person's writing. Adapt their voice for X/Twitter, punchier and faster-paced, while still feeling recognizably like them.

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
${goalsSection ? `\n${goalsSection}` : ''}

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
1. Capture this person's voice, adapted for X's punchier culture, without copying wording from prior samples
2. Decide: standalone tweet OR thread based on story complexity
3. If thread: Hook in first tweet, expand in subsequent tweets
4. Can be more provocative/contrarian than LinkedIn
5. Match their voice quirks, humor style, and personality
6. NEVER use em dashes (—) anywhere. Use commas, periods, or other punctuation instead.

${buildAntiCopySection('writing samples and source story')}

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
  const goalsSection = buildGoalsSection(profile);

  const platformGuidelines = platform === 'linkedin'
    ? 'Write a professional LinkedIn post (1300-2000 characters). Use line breaks, include 3-5 hashtags, end with engagement hook.'
    : 'Write for X/Twitter. Keep it punchy (under 280 characters for single tweet, or create a thread for complex topics).';

  return `
You are a ghostwriter who has studied this person's writing style. Write something fresh that feels like them, not a remix of their prior text.

ABOUT THE AUTHOR:
"${profile.jobDescription || 'A professional'}"

TOPIC/IDEA: ${topic}

${voiceSection}
${writingSamples}
${perspectives ? `\n${perspectives}` : ''}
${goalsSection ? `\n${goalsSection}` : ''}

PLATFORM GUIDELINES: ${platformGuidelines}

IMPORTANT: NEVER use em dashes (—) anywhere in the content. Use commas, periods, or other punctuation instead.
If the platform is LinkedIn, do not use markdown emphasis, bullet lists, numbered lists, or heading syntax. Use plain text and line breaks only.
${buildAntiCopySection('writing samples and user-provided topic framing')}

Write content that reflects this person's natural voice, judgment, and cadence while using fresh wording. Return only the post content${platform === 'x' ? ' as JSON with isThread, content, and threadBreakdown fields' : ''}.
`.trim();
}

export function buildResearchDraftsPrompt(
  research: ResearchBriefContext,
  profile: Partial<VoiceProfile>
): string {
  const voiceSection = buildVoiceSection(profile);
  const writingSamples = buildWritingSamplesSection(profile, 'linkedin');
  const perspectives = buildPerspectivesSection(profile, research.query);
  const toneSection = buildToneSection(profile);
  const goalsSection = buildGoalsSection(profile);
  const preferredTypes = (profile.postTypeRatings as Array<{ type: string; rating: number }> || [])
    .filter((rating) => rating.rating >= 4)
    .map((rating) => rating.type)
    .join(', ');

  return `
You are a ghostwriter who has studied this person's writing style. Use the structured research brief below to create three DISTINCT LinkedIn draft posts in their voice.

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
${goalsSection ? `\n${goalsSection}` : ''}

RESEARCH TOPIC:
${research.query}

RESEARCH BRIEF:
${research.summary}

KEY FINDINGS:
${research.keyFindings.map((finding) => `- ${finding}`).join('\n')}

SOURCE REFERENCES:
${research.sources.map((source) => `- ${source.title} (${source.domain}) - ${source.url}`).join('\n')}

LINKEDIN BEST PRACTICES:
- Length: 900-1500 characters
- Hook: First 2 lines must grab attention
- Formatting: Use line breaks every 1-2 sentences for readability
- End with a question, call-to-action, or memorable closing thought

REQUIREMENTS:
1. Create 3 MEANINGFULLY DIFFERENT drafts, not minor variations.
2. Ground each draft in the research brief and findings above.
3. Vary the hook, framing, and angle for each version.
4. Focus on implications, patterns, tension, or practical takeaways, not generic summaries.
5. Capture this person's rhythm, confidence level, specificity, and quirks without copying any prior sample literally.
6. NEVER use em dashes (—) anywhere. Use commas, periods, or other punctuation instead.
7. Do not use markdown or unsupported LinkedIn formatting. No **bold**, *italic*, bullet lists, numbered lists, or heading markers. Use plain text plus line breaks only.

${buildAntiCopySection('research brief, source material, and writing samples')}

Return valid JSON in exactly this shape:
{
  "intro": "I pulled together a quick research brief and drafted 3 possible directions.",
  "posts": [
    { "platform": "linkedin", "content": "..." },
    { "platform": "linkedin", "content": "..." },
    { "platform": "linkedin", "content": "..." }
  ],
  "followUp": "Want me to make one more contrarian, tighter, or more detailed?"
}

Return ONLY valid JSON, no markdown fences or commentary.
`.trim();
}

export function buildArticleDraftsPrompt(
  article: ArticleDraftContext,
  profile: Partial<VoiceProfile>
): string {
  const voiceSection = buildVoiceSection(profile);
  const writingSamples = buildWritingSamplesSection(profile, 'linkedin');
  const perspectives = buildPerspectivesSection(profile, article.topic);
  const toneSection = buildToneSection(profile);
  const goalsSection = buildGoalsSection(profile);
  const preferredTypes = (profile.postTypeRatings as Array<{ type: string; rating: number }> || [])
    .filter((rating) => rating.rating >= 4)
    .map((rating) => rating.type)
    .join(', ');

  return `
You are a ghostwriter who has studied this person's writing style. Read the source material below and create three DISTINCT LinkedIn draft posts in their voice, expressed in fresh language.

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
${goalsSection ? `\n${goalsSection}` : ''}

SOURCE MATERIAL:
Title: ${article.title}
Author: ${article.author || 'Unknown'}
Published: ${article.publishedDate || 'Unknown'}
URL: ${article.url}
Source type: ${article.sourceType}
Topic: ${article.topic || 'General'}
Summary: ${article.summary}
Key points:
${article.keyPoints.map((point) => `- ${point}`).join('\n')}

Additional article context:
${article.content.slice(0, 3500)}

LINKEDIN BEST PRACTICES:
- Length: 900-1500 characters
- Hook: First 2 lines must grab attention
- Formatting: Use line breaks every 1-2 sentences for readability
- End with a question, call-to-action, or memorable closing thought

REQUIREMENTS:
1. Capture this person's rhythm, confidence level, specificity, and quirks without copying any prior sample literally.
2. Create 3 MEANINGFULLY DIFFERENT drafts, not minor variations.
3. Change the hook and framing for each draft.
4. Vary the core angle, such as analysis, implication, lesson, contrarian read, or practical takeaway.
5. Use the source material as the factual backbone, but express it in new wording and a new structure.
6. Make each draft feel publishable.
7. NEVER use em dashes (—) anywhere. Use commas, periods, or other punctuation instead.
8. Do not use markdown or unsupported LinkedIn formatting. No **bold**, *italic*, bullet lists, numbered lists, or heading markers. Use plain text plus line breaks only.

${buildAntiCopySection('source material and writing samples')}

Return valid JSON in exactly this shape:
{
  "intro": "I read the article and drafted 3 possible directions.",
  "posts": [
    { "platform": "linkedin", "content": "..." },
    { "platform": "linkedin", "content": "..." },
    { "platform": "linkedin", "content": "..." }
  ],
  "followUp": "Want me to make one more contrarian, tighter, or more educational?"
}

Return ONLY valid JSON, no markdown fences or commentary.
`.trim();
}

export function buildDraftEditPrompt(
  instruction: string,
  drafts: Array<{
    index: number;
    platform: 'linkedin' | 'x';
    content: string;
  }>,
  profile: Partial<VoiceProfile>,
  editAllDrafts: boolean,
  requiredAdditions: string[] = []
): string {
  const voiceSection = buildVoiceSection(profile);
  const writingSamples = buildWritingSamplesSection(profile, 'linkedin');
  const toneSection = buildToneSection(profile);
  const goalsSection = buildGoalsSection(profile);
  const lowerInstruction = instruction.toLowerCase();
  const asksToCutInHalf = /half|50%|fifty percent/.test(lowerInstruction);
  const asksToShorten = /\b(shorter|shorten|trim|tighter|tighten|cut|reduce|condense|more concise|less wordy)\b/.test(lowerInstruction);
  const asksToLengthen = /\b(longer|expand|lengthen|more detail|more detailed|add detail|flesh out)\b/.test(lowerInstruction);
  const draftWordCounts = drafts.map((draft) => ({
    index: draft.index,
    words: draft.content.split(/\s+/).filter(Boolean).length,
  }));

  let lengthRules = '';
  if (asksToCutInHalf) {
    lengthRules = `
LENGTH REQUIREMENT:
- The user explicitly asked to cut the draft roughly in half.
- For each revised draft, target about 40% to 60% of the original word count.
- UNDER NO CIRCUMSTANCES should the revised draft be longer than the original.
`.trim();
  } else if (asksToShorten) {
    lengthRules = `
LENGTH REQUIREMENT:
- The user explicitly asked for a shorter version.
- Make the revision materially shorter, not just slightly tighter.
- Target about 60% to 80% of the original word count.
- UNDER NO CIRCUMSTANCES should the revised draft be longer than the original.
`.trim();
  } else if (asksToLengthen) {
    lengthRules = `
LENGTH REQUIREMENT:
- The user explicitly asked for a longer or more developed version.
- Expand with substance, not filler.
- Keep the voice tight and publishable.
`.trim();
  }

  const requiredAdditionsSection = requiredAdditions.length
    ? `
MANDATORY DETAILS TO INCLUDE:
${requiredAdditions.map((addition) => `- ${addition}`).join('\n')}

Every targeted draft must clearly include these details. If any are missing, the answer is wrong.
`.trim()
    : '';

  return `
You are helping a user refine existing social post drafts. Keep the same core idea unless the user explicitly asks for a more substantial rewrite, but do not preserve phrasing so literally that it feels copied.

ABOUT THE AUTHOR:
"${profile.jobDescription || 'A professional in their field'}"

${voiceSection}
${writingSamples}

CONTENT PROFILE:
- Topics of interest: ${(profile.primaryTopics || []).join(', ')}
- Topics to avoid: ${(profile.avoidTopics || []).join(', ')}
- ${toneSection}
${goalsSection ? `\n${goalsSection}` : ''}
${requiredAdditionsSection ? `\n${requiredAdditionsSection}` : ''}

USER INSTRUCTION:
${instruction}

TARGET DRAFTS:
${drafts.map((draft) => `
Draft ${draft.index + 1} (${draft.platform}):
Current word count: ${draftWordCounts.find((item) => item.index === draft.index)?.words ?? 0}
${draft.content}
`).join('\n')}

EDITING RULES:
1. Revise ONLY the target drafts shown above.
2. ${editAllDrafts ? 'Update all provided drafts while keeping them meaningfully distinct from each other.' : 'Return exactly one revised draft for the single target draft above.'}
3. Follow the user's instruction faithfully.
4. Preserve the author's voice and overall quality.
5. Keep the draft publishable, not rough or note-like.
6. NEVER use em dashes (—) anywhere. Use commas, periods, or other punctuation instead.
7. Preserve the original post's formatting rhythm unless the user explicitly asks to change it. Keep paragraph breaks, spacing, and short-line structure aligned with the source draft rather than collapsing everything into one block.
8. For LinkedIn drafts, do not use markdown or unsupported platform formatting. No **bold**, *italic*, bullet lists, numbered lists, or heading markers. Use plain text and line breaks only.
${lengthRules ? `9. ${lengthRules}` : ''}

${buildAntiCopySection('target drafts')}

IMPORTANT:
- If the user asks to make a draft shorter, your answer is WRONG if the revised draft ends up longer than the original.
- Prioritize obeying the requested transformation over adding extra color or explanation.
- Social post readability matters. Preserve scannable spacing and paragraph breaks from the original draft.
- Do not add formatting that will render as raw markdown or awkward list syntax on LinkedIn.

Return valid JSON in exactly this shape:
{
  "reply": "One short sentence explaining what changed.",
  "drafts": [
    { "index": 0, "content": "..." }
  ]
}

The "index" must match the draft number provided above minus 1.
Return ONLY valid JSON, no markdown fences or commentary.
`.trim();
}
