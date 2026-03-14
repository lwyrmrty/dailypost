export interface RewritePair {
  original: string;
  rewrite: string;
  topic: string;
}

export interface VoiceDiscoveryData {
  picks: Array<{
    dimension: string;
    chosenTrait: string;
    confidence: 'strong' | 'slight';
  }>;
  summary: Record<string, string>;
}

export interface PostTypePreference {
  type: string;
  rating: number;
}

const TRAIT_DESCRIPTIONS: Record<string, string> = {
  bold_contrarian: 'Takes bold, direct positions. Challenges conventional wisdom. Not afraid to be provocative.',
  balanced_nuanced: 'Presents balanced, nuanced takes. Acknowledges multiple sides. Measured and thoughtful.',
  data_driven: 'Leads with data, numbers, and evidence. Analytical. Uses specific metrics to make points.',
  narrative_storytelling: 'Leads with stories and narratives. Uses anecdotes and personal experiences to illustrate points.',
  formal_polished: 'Professional, polished tone. Carefully worded. Industry-appropriate language.',
  casual_conversational: 'Casual, conversational style. Writes like talking to a friend. Uses contractions and colloquialisms.',
  uses_humor: 'Incorporates wit and humor. Playful tone. Uses self-deprecation and clever observations.',
  straight_serious: 'Straightforward and serious. Focuses on substance. Minimal humor or personality flourishes.',
  concise_punchy: 'Short, punchy style. One thought per line. Values brevity. Gets to the point fast.',
  detailed_thorough: 'Detailed, thorough style. Develops ideas fully. Uses examples and explanations.',
  opinionated_declarative: 'Strongly opinionated. Makes declarations. Uses definitive language ("Full stop.", "Bet on it.").',
  curious_socratic: 'Asks questions. Explores ideas. Invites conversation. Uses "What if?" and "I wonder..." framing.',
};

function buildDiscoverySection(discovery: VoiceDiscoveryData): string {
  if (!discovery || !discovery.picks || discovery.picks.length === 0) return '';

  const lines = discovery.picks.map(pick => {
    const desc = TRAIT_DESCRIPTIONS[pick.chosenTrait] || pick.chosenTrait;
    const strength = pick.confidence === 'strong' ? 'STRONGLY prefers' : 'Slightly prefers';
    return `- ${pick.dimension}: ${strength}: ${desc}`;
  });

  return `
VOICE PREFERENCES (the user chose these in A/B style comparisons — this reveals their aspirational voice):
${lines.join('\n')}

These preferences are especially important if writing samples are limited. They represent how the user WANTS to sound.`;
}

function humanizePostType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildPostTypeSection(postTypePreferences?: PostTypePreference[]): string {
  if (!postTypePreferences?.length) return '';

  const sorted = [...postTypePreferences]
    .filter((item) => item.rating > 0)
    .sort((a, b) => b.rating - a.rating);

  if (!sorted.length) return '';

  const lines = sorted.map((item) => `- ${humanizePostType(item.type)}: ${item.rating}/5`);

  return `
POST FORMAT PREFERENCES (this is a soft prior, not hard voice truth):
${lines.join('\n')}

Use this to understand which formats and angles the user naturally gravitates toward. Let it influence examples and likely instincts, but do not let it overpower the writing samples themselves.`;
}

/**
 * Build the prompt for structured voice analysis (dimensions & metrics).
 * This produces the structured JSON that powers the UI display and
 * serves as a fallback when a Style Bible isn't available.
 */
export function buildVoiceAnalysisPrompt(
  posts: string[],
  rewritePairs?: RewritePair[],
  voiceDiscovery?: VoiceDiscoveryData,
  postTypePreferences?: PostTypePreference[]
): string {
  const discoverySection = voiceDiscovery ? buildDiscoverySection(voiceDiscovery) : '';
  const postTypeSection = buildPostTypeSection(postTypePreferences);

  let rewriteSection = '';
  if (rewritePairs && rewritePairs.length > 0) {
    rewriteSection = `

DIRECTED WRITING EXERCISES (these are especially revealing — the user wrote original posts in response to prompts):
${rewritePairs.map((pair, i) => `
--- Rewrite ${i + 1}: ${pair.topic} ---
PROMPT: ${pair.original}
THEIR VERSION: ${pair.rewrite}
`).join('\n')}

Pay special attention to how they approached each prompt. These samples reveal their natural instincts: how they open, structure ideas, express conviction, explain concepts, and add personality.`;
  }

  return `
You are an expert writing style analyst. Analyze these writing samples with extreme precision to create a comprehensive voice fingerprint. Your goal is to capture the writer's abstract style tendencies and decision-making patterns, not to help someone copy exact wording.

Writing Samples:
${posts.map((post, i) => `\n--- Sample ${i + 1} ---\n${post}`).join('\n')}
${rewriteSection}
${discoverySection}
${postTypeSection}

Analyze deeply and return JSON with the following structure. Be SPECIFIC and EVIDENCE-BASED. You may quote short phrases where useful, but focus on patterns over memorized wording.

{
  "sentencePatterns": {
    "avgLength": number (in words),
    "variability": "consistent" | "varied" | "highly_varied",
    "preferredStructures": string[] (e.g., "starts with short declarative, follows with longer explanation", "uses fragments for emphasis")
  },
  "openingPatterns": {
    "style": string (e.g., "bold claim", "question", "anecdote", "statistic", "direct address"),
    "examples": string[] (quote 2-3 actual opening lines from the samples),
    "hookLength": "short_punchy" | "medium" | "long_setup"
  },
  "closingPatterns": {
    "style": string (e.g., "call to action", "question to audience", "forward-looking statement", "summary takeaway"),
    "examples": string[] (quote 2-3 actual closing lines from the samples)
  },
  "vocabulary": {
    "level": "simple" | "moderate" | "advanced" | "mixed",
    "jargonUsage": "heavy" | "moderate" | "avoids_jargon",
    "signatureWords": string[] (5-10 words/phrases they use distinctively or repeatedly),
    "transitionWords": string[] (their preferred connectors: "however", "that said", "here's the thing", etc.),
    "fillerPhrases": string[] (casual phrases: "honestly", "look", "let me be real", etc.)
  },
  "tone": {
    "primary": string (e.g., "authoritative but approachable"),
    "formality": number (1-10, where 1 is extremely casual and 10 is academic),
    "warmth": number (1-10, where 1 is detached/analytical and 10 is warm/personal),
    "confidence": "assertive" | "measured" | "exploratory" | "self-deprecating"
  },
  "personality": {
    "humorStyle": "none" | "dry_wit" | "self_deprecating" | "playful" | "sarcastic" | "observational",
    "humorFrequency": "never" | "rare" | "occasional" | "frequent",
    "opinionStrength": "strong_convictions" | "balanced_nuanced" | "questioning_exploratory",
    "vulnerability": "guarded" | "occasionally_personal" | "openly_vulnerable",
    "contrarianism": "conventional" | "mild_challenger" | "strong_contrarian"
  },
  "formatting": {
    "paragraphLength": "short_1_2_sentences" | "medium_3_4_sentences" | "long_5_plus",
    "lineBreakUsage": "frequent_single_lines" | "paragraph_blocks" | "mixed",
    "listUsage": "never" | "occasional" | "frequent",
    "emphasisStyle": string[] (e.g., "ALL CAPS for emphasis", "bold text", "italics", "quotation marks around key terms"),
    "emojiUsage": "none" | "rare" | "moderate" | "heavy",
    "hashtagStyle": "none" | "minimal_1_2" | "moderate_3_5" | "heavy_5_plus"
  },
  "punctuation": {
    "exclamationMarks": "never" | "rare" | "moderate" | "frequent",
    "ellipsis": "never" | "occasional" | "frequent",
    "dashes": "never" | "occasional" | "frequent",
    "parentheticals": "never" | "occasional" | "frequent",
    "colonUsage": "rare" | "moderate" | "frequent"
  },
  "perspective": {
    "pointOfView": "first_person_singular" | "first_person_plural" | "second_person" | "mixed",
    "audienceAddress": "direct" | "indirect" | "mixed",
    "selfReference": string (how they refer to themselves: "As a founder...", "In my experience...", "I've seen..."),
    "storytellingVsAnalysis": number (1-10, where 1 is pure data/analysis and 10 is pure narrative/storytelling)
  },
  "persuasionTechniques": {
    "primaryMethod": "data_and_evidence" | "personal_experience" | "social_proof" | "logical_reasoning" | "emotional_appeal" | "authority",
    "evidenceStyle": string (e.g., "cites specific numbers", "references named experts", "uses personal anecdotes"),
    "callToAction": string (their typical CTA pattern, e.g., "asks audience opinion", "challenges reader to try something", "none")
  },
  "platformAdaptation": {
    "linkedinStyle": string (how they'd naturally write for LinkedIn based on these samples),
    "twitterStyle": string (how they'd adapt for X/Twitter — punchier, more provocative, etc.)
  },
  "uniqueQuirks": string[] (3-5 distinctive habits that make their writing instantly recognizable),
  "voiceSummary": string (a rich 4-6 sentence paragraph describing their overall voice as if briefing a ghostwriter),
  "exampleReconstruction": string (write a short 2-3 sentence example IN THEIR VOICE about a generic tech topic, to prove you've captured the style)
}

Return ONLY valid JSON, no other text.
`.trim();
}

/**
 * Build the prompt for generating a Style Bible — a rich, free-form narrative
 * document that captures voice in a way structured fields never can.
 *
 * This is the PRIMARY voice instruction used in post generation.
 * Think of it as the document you'd hand a ghostwriter on day one.
 */
export function buildStyleBiblePrompt(
  posts: string[],
  rewritePairs?: RewritePair[],
  jobDescription?: string,
  structuredAnalysis?: Record<string, unknown>,
  voiceDiscovery?: VoiceDiscoveryData,
  postTypePreferences?: PostTypePreference[]
): string {
  const discoverySection = voiceDiscovery ? buildDiscoverySection(voiceDiscovery) : '';
  const postTypeSection = buildPostTypeSection(postTypePreferences);
  let rewriteSection = '';
  if (rewritePairs && rewritePairs.length > 0) {
    rewriteSection = `

DIRECTED WRITING EXERCISES (the user wrote original posts in response to these prompts — this is especially revealing):
${rewritePairs.map((pair, i) => `
--- Rewrite ${i + 1}: ${pair.topic} ---
PROMPT: ${pair.original}
THEIR VERSION: ${pair.rewrite}
`).join('\n')}`;
  }

  let analysisHint = '';
  if (structuredAnalysis) {
    analysisHint = `

For reference, here is a structured analysis of their writing that was already performed:
${JSON.stringify(structuredAnalysis, null, 2)}

Use this as a starting point, but go DEEPER. The style bible should capture nuances and connections that structured fields miss.`;
  }

  return `
You are the world's best ghostwriter being onboarded to write for a new client. You've been given samples of their writing and need to create your personal "Style Bible" — the document you'll reference every time you try to capture their voice faithfully without copying them line by line.

${jobDescription ? `THE CLIENT: ${jobDescription}` : ''}

THEIR WRITING SAMPLES:
${posts.map((post, i) => `\n--- Sample ${i + 1} ---\n${post}`).join('\n')}
${rewriteSection}
${discoverySection}
${postTypeSection}
${analysisHint}

${posts.length < 5 && discoverySection ? `IMPORTANT: This client has limited writing samples. Lean heavily on their voice discovery preferences (above) to shape the Style Bible. The preferences represent how they WANT to sound, even if they haven't written much yet. Build the Style Bible around their aspirational voice.\n` : ''}
Write a comprehensive Style Bible (800-1200 words) structured as follows. Write it as a direct, practical reference document — not an academic analysis. Use second person ("you should", "notice how they") as if briefing another ghostwriter. Focus on repeatable patterns, instincts, and stylistic choices. Avoid long verbatim excerpts from the samples.

## CORE VOICE
What does this person fundamentally sound like? What's the first thing you'd tell another writer trying to capture their voice authentically? What's the "vibe"?

## RHYTHM & CADENCE
How do their sentences flow? What's their pacing like? When do they go short vs. long? How do they use line breaks, white space, and paragraph structure? Quote specific examples.

## WORD CHOICES & PHRASES
What words and phrases are distinctly THEIRS? What vocabulary do they reach for? What words would they NEVER use? What are their go-to transitions, openers, and conversational tics?

## OPINION & STANCE
How do they take positions? Are they bold or hedged? Contrarian or consensus-building? How do they handle disagreement or controversial topics? Do they lead with "I think" or present things as fact?

## HOOKS & CLOSERS
How do they open? How do they close? What patterns do they use to grab attention and leave an impression? Quote their actual openings and closings.

## PERSONALITY ON THE PAGE
What makes them THEM vs. a generic professional? Where does their personality leak through? Humor, vulnerability, confidence, quirks? What would make a reader say "that's definitely [them]"?

## DO's AND DON'Ts
A concrete checklist:
- DO: [specific behaviors to replicate]
- DON'T: [specific things to avoid — what would make it sound fake]

## LINKEDIN vs X
How should the voice adapt between platforms? What stays the same? What changes?

Write the Style Bible as CONTINUOUS PROSE within each section (not bullet points, unless in the Do's/Don'ts section). Be specific and use only short excerpts where needed. This document should be strong enough that any skilled writer could read it and immediately produce content that feels authentically like the client without needing to copy their wording.

Return ONLY the Style Bible text, no other preamble.
`.trim();
}

/**
 * Build voice guidelines from structured analysis.
 * Used as a supplement to the Style Bible, or as the primary instruction
 * when no Style Bible is available.
 */
export function buildVoiceGuidelines(voiceAnalysis: Record<string, unknown>): string {
  if (!voiceAnalysis) {
    return 'Write in a professional yet approachable tone.';
  }

  const guidelines: string[] = [];

  // Voice summary is the richest single instruction
  if (voiceAnalysis.voiceSummary) {
    guidelines.push(`VOICE IDENTITY: ${voiceAnalysis.voiceSummary}`);
  }

  // Sentence patterns
  const sentencePatterns = voiceAnalysis.sentencePatterns as Record<string, unknown> | undefined;
  if (sentencePatterns) {
    const avgLen = sentencePatterns.avgLength as number;
    if (avgLen) {
      if (avgLen < 12) {
        guidelines.push('Keep sentences short and punchy (averaging under 12 words).');
      } else if (avgLen > 20) {
        guidelines.push('Use longer, more elaborate sentences (averaging 20+ words).');
      }
    }
    if (sentencePatterns.variability === 'highly_varied') {
      guidelines.push('Vary sentence length dramatically — mix very short fragments with longer explanations.');
    }
    if (sentencePatterns.preferredStructures && Array.isArray(sentencePatterns.preferredStructures)) {
      guidelines.push(`Sentence structure tendencies: ${(sentencePatterns.preferredStructures as string[]).join('; ')}.`);
    }
  }

  // Opening patterns
  const openingPatterns = voiceAnalysis.openingPatterns as Record<string, unknown> | undefined;
  if (openingPatterns) {
    guidelines.push(`OPENING STYLE: ${openingPatterns.style}. Hook should be ${openingPatterns.hookLength === 'short_punchy' ? 'short and punchy' : openingPatterns.hookLength === 'long_setup' ? 'a longer narrative setup' : 'medium length'}.`);
    if (openingPatterns.examples && Array.isArray(openingPatterns.examples)) {
      guidelines.push(`Example openings from their writing: ${(openingPatterns.examples as string[]).map(e => `"${e}"`).join(' | ')}`);
    }
  }

  // Closing patterns
  const closingPatterns = voiceAnalysis.closingPatterns as Record<string, unknown> | undefined;
  if (closingPatterns) {
    guidelines.push(`CLOSING STYLE: ${closingPatterns.style}.`);
  }

  // Vocabulary
  const vocabulary = voiceAnalysis.vocabulary as Record<string, unknown> | undefined;
  if (vocabulary) {
    if (vocabulary.level === 'advanced') {
      guidelines.push('Use sophisticated vocabulary and industry terminology.');
    } else if (vocabulary.level === 'simple') {
      guidelines.push('Use simple, accessible language — avoid jargon.');
    }

    if (vocabulary.signatureWords && Array.isArray(vocabulary.signatureWords)) {
      guidelines.push(`SIGNATURE WORDS/PHRASES (use these naturally): ${(vocabulary.signatureWords as string[]).join(', ')}`);
    }

    if (vocabulary.transitionWords && Array.isArray(vocabulary.transitionWords)) {
      guidelines.push(`Preferred transitions: ${(vocabulary.transitionWords as string[]).join(', ')}`);
    }

    if (vocabulary.fillerPhrases && Array.isArray(vocabulary.fillerPhrases)) {
      guidelines.push(`Natural filler phrases: ${(vocabulary.fillerPhrases as string[]).join(', ')}`);
    }
  }

  // Tone
  const tone = voiceAnalysis.tone as Record<string, unknown> | undefined;
  if (tone) {
    if (tone.primary) {
      guidelines.push(`Overall tone: ${tone.primary}.`);
    }
    const formality = tone.formality as number;
    if (formality) {
      if (formality <= 3) guidelines.push('Keep it very casual and conversational.');
      else if (formality >= 8) guidelines.push('Maintain a formal, polished tone.');
    }
    if (tone.confidence === 'assertive') {
      guidelines.push('Be direct and confident in assertions — don\'t hedge unnecessarily.');
    } else if (tone.confidence === 'exploratory') {
      guidelines.push('Take an exploratory, thinking-out-loud approach rather than making declarations.');
    }
  }

  // Personality
  const personality = voiceAnalysis.personality as Record<string, unknown> | undefined;
  if (personality) {
    if (personality.humorStyle && personality.humorStyle !== 'none') {
      const humorMap: Record<string, string> = {
        dry_wit: 'Include dry wit and understated humor.',
        self_deprecating: 'Add self-deprecating humor where natural.',
        playful: 'Be playful and lighthearted in tone.',
        sarcastic: 'Include sharp, sarcastic observations.',
        observational: 'Include wry observational humor.',
      };
      guidelines.push(humorMap[personality.humorStyle as string] || '');
    }

    if (personality.opinionStrength === 'strong_convictions') {
      guidelines.push('Take strong, clear positions — don\'t be wishy-washy.');
    } else if (personality.opinionStrength === 'balanced_nuanced') {
      guidelines.push('Present balanced, nuanced takes that acknowledge multiple sides.');
    }

    if (personality.contrarianism === 'strong_contrarian') {
      guidelines.push('Challenge conventional wisdom and popular narratives.');
    }
  }

  // Formatting
  const formatting = voiceAnalysis.formatting as Record<string, unknown> | undefined;
  if (formatting) {
    if (formatting.lineBreakUsage === 'frequent_single_lines') {
      guidelines.push('Use frequent line breaks — one thought per line for visual impact.');
    } else if (formatting.lineBreakUsage === 'paragraph_blocks') {
      guidelines.push('Write in flowing paragraph blocks rather than single-line breaks.');
    }

    if (formatting.listUsage === 'frequent') {
      guidelines.push('Use bullet points and numbered lists often.');
    } else if (formatting.listUsage === 'never') {
      guidelines.push('Avoid bullet points and lists — use flowing prose.');
    }

    if (formatting.emphasisStyle && Array.isArray(formatting.emphasisStyle)) {
      guidelines.push(`Emphasis style: ${(formatting.emphasisStyle as string[]).join(', ')}.`);
    }

    if (formatting.emojiUsage === 'none') {
      guidelines.push('Do NOT use emojis.');
    } else if (formatting.emojiUsage === 'moderate' || formatting.emojiUsage === 'heavy') {
      guidelines.push('Include relevant emojis naturally throughout.');
    }
  }

  // Punctuation
  const punctuation = voiceAnalysis.punctuation as Record<string, unknown> | undefined;
  if (punctuation) {
    if (punctuation.exclamationMarks === 'frequent') {
      guidelines.push('Use exclamation marks for energy and emphasis.');
    } else if (punctuation.exclamationMarks === 'never') {
      guidelines.push('Avoid exclamation marks.');
    }
    if (punctuation.ellipsis === 'frequent') {
      guidelines.push('Use ellipsis (...) for dramatic pauses and trailing thoughts.');
    }
    if (punctuation.parentheticals === 'frequent') {
      guidelines.push('Use parenthetical asides for commentary and caveats.');
    }
  }

  // Perspective
  const perspective = voiceAnalysis.perspective as Record<string, unknown> | undefined;
  if (perspective) {
    if (perspective.selfReference) {
      guidelines.push(`Self-reference style: ${perspective.selfReference}`);
    }
    const storyVsAnalysis = perspective.storytellingVsAnalysis as number;
    if (storyVsAnalysis) {
      if (storyVsAnalysis >= 7) {
        guidelines.push('Lead with stories and narratives over data.');
      } else if (storyVsAnalysis <= 3) {
        guidelines.push('Lead with data, analysis, and logical arguments over personal stories.');
      }
    }
  }

  // Persuasion
  const persuasion = voiceAnalysis.persuasionTechniques as Record<string, unknown> | undefined;
  if (persuasion) {
    if (persuasion.evidenceStyle) {
      guidelines.push(`Evidence style: ${persuasion.evidenceStyle}`);
    }
    if (persuasion.callToAction) {
      guidelines.push(`CTA pattern: ${persuasion.callToAction}`);
    }
  }

  // Unique quirks
  if (voiceAnalysis.uniqueQuirks && Array.isArray(voiceAnalysis.uniqueQuirks)) {
    guidelines.push(`DISTINCTIVE QUIRKS: ${(voiceAnalysis.uniqueQuirks as string[]).join('; ')}`);
  }

  return guidelines.filter(g => g.length > 0).join('\n');
}

/**
 * Select representative writing samples to infer voice patterns later.
 * Prefer real uploaded content over guided exercises so generation
 * is anchored in organic writing rather than prompted responses.
 */
export function selectFewShotExamples(
  samplePosts: string[] | null,
  uploadedContent: string[] | null,
  maxExamples: number = 3,
  platform?: 'linkedin' | 'x'
): string[] {
  const sortForPlatform = (samples: string[]) => [...samples].sort((a, b) => {
    if (platform === 'x') return a.length - b.length;
    if (platform === 'linkedin') return b.length - a.length;
    return 0;
  });
  const uploadedSamples = sortForPlatform((uploadedContent || []).filter((sample) => sample.trim().length > 30));
  const guidedSamples = sortForPlatform((samplePosts || []).filter((sample) => sample.trim().length > 30));
  const preferredPool = uploadedSamples.length > 0 ? uploadedSamples : guidedSamples;

  if (preferredPool.length === 0) return [];

  if (preferredPool.length <= maxExamples) return preferredPool;

  const selected: string[] = [];
  const step = Math.floor(preferredPool.length / maxExamples);
  for (let i = 0; i < maxExamples; i++) {
    selected.push(preferredPool[Math.min(i * step, preferredPool.length - 1)]);
  }

  return selected;
}

/**
 * Build a prompt to generate calibration posts for A/B voice comparison.
 * Generates multiple versions so the user can pick "which sounds most like me?"
 */
export function buildCalibrationPrompt(
  styleBible: string,
  topic: string,
  platform: 'linkedin' | 'x',
  postTypePreferences?: PostTypePreference[],
  priorFeedback?: Array<{
    content: string;
    rating: 'not_accurate' | 'good' | 'great';
    postType?: string;
  }>
): string {
  const platformContext = platform === 'linkedin'
    ? 'a LinkedIn post (500-900 characters, professional but engaging, with line breaks)'
    : 'an X/Twitter post (under 280 characters, punchy and direct)';
  const preferredTypes = (postTypePreferences ?? [])
    .filter((item) => item.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .map((item) => humanizePostType(item.type));

  const feedbackSection = priorFeedback?.length
    ? `

FEEDBACK FROM PREVIOUS VALIDATION BATCHES:
${priorFeedback.map((item, index) => `
Example ${index + 1} (${item.rating.toUpperCase()}${item.postType ? `, ${humanizePostType(item.postType)}` : ''}):
${item.content}
`).join('\n')}

Lean toward the traits present in GREAT examples. Avoid the voice, structure, and framing patterns present in NOT_ACCURATE examples.
`
    : '';
  const postTypeSection = preferredTypes.length
    ? `
FAVOR THESE POST FORMATS WHEN NATURAL:
${preferredTypes.map((type) => `- ${type}`).join('\n')}

Vary the set across these formats instead of repeating the same shape too often.
`
    : '';

  return `
You are testing whether you've captured a client's voice correctly. Here is their Style Bible:

${styleBible}

Write 10 DIFFERENT versions of ${platformContext} about this topic: "${topic}".
${postTypeSection}
${feedbackSection}

Each version should:
- Sound like the same person (the client)
- Feel publishable, not like a rough draft
- Take a meaningfully different angle, hook, structure, or post format
- Stay faithful to the Style Bible above
- Avoid repeating the same opener, CTA, or structure across the batch
- Prioritize voice accuracy over cleverness

Return JSON:
{
  "versions": [
    {"label": "1", "postType": "...", "content": "..."},
    {"label": "2", "postType": "...", "content": "..."}
  ]
}

Return ONLY valid JSON, no other text.
`.trim();
}
