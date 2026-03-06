export function buildVoiceAnalysisPrompt(posts: string[]): string {
  return `
You are an expert writing style analyst. Analyze these writing samples with extreme precision to create a comprehensive voice fingerprint. Your goal is to capture every nuance so that someone could perfectly replicate this person's writing style.

Writing Samples:
${posts.map((post, i) => `\n--- Sample ${i + 1} ---\n${post}`).join('\n')}

Analyze deeply and return JSON with the following structure. Be SPECIFIC and EVIDENCE-BASED — quote actual phrases from the samples where possible.

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
 * Select the best representative writing samples to include as few-shot examples.
 * Picks diverse samples that showcase different aspects of the writer's voice.
 */
export function selectFewShotExamples(
  samplePosts: string[] | null,
  uploadedContent: string[] | null,
  maxExamples: number = 3,
  platform?: 'linkedin' | 'x'
): string[] {
  const allSamples = [
    ...(uploadedContent || []),
    ...(samplePosts || []),
  ].filter(s => s.trim().length > 30);

  if (allSamples.length === 0) return [];

  // For X, prefer shorter samples; for LinkedIn, prefer longer ones
  const sorted = [...allSamples].sort((a, b) => {
    if (platform === 'x') return a.length - b.length;
    if (platform === 'linkedin') return b.length - a.length;
    return 0;
  });

  // Pick diverse samples: shortest, longest, and one from the middle
  if (sorted.length <= maxExamples) return sorted;

  const selected: string[] = [];
  const step = Math.floor(sorted.length / maxExamples);
  for (let i = 0; i < maxExamples; i++) {
    selected.push(sorted[Math.min(i * step, sorted.length - 1)]);
  }

  return selected;
}
