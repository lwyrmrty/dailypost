export function buildVoiceAnalysisPrompt(posts: string[]): string {
  return `
Analyze these writing samples and extract patterns to create a voice profile.

Writing Samples:
${posts.map((post, i) => `\n--- Sample ${i + 1} ---\n${post}`).join('\n')}

Please analyze and return JSON with:
{
  "avgSentenceLength": number (in words),
  "vocabularyLevel": "simple" | "moderate" | "advanced",
  "questionUsage": "high" | "medium" | "low",
  "humorLevel": "none" | "subtle" | "frequent",
  "structurePreference": "paragraphs" | "bullets" | "mixed",
  "persuasionStyle": "data-driven" | "storytelling" | "authority-based" | "mixed",
  "commonPhrases": string[] (3-5 phrases they use often),
  "emojiUsage": "none" | "occasional" | "frequent",
  "insights": string (2-3 sentences about their unique voice)
}

Return ONLY valid JSON, no other text.
`.trim();
}

export function buildVoiceGuidelines(voiceAnalysis: Record<string, unknown>): string {
  if (!voiceAnalysis) {
    return 'Write in a professional yet approachable tone.';
  }

  const guidelines: string[] = [];

  if (voiceAnalysis.avgSentenceLength) {
    const length = voiceAnalysis.avgSentenceLength as number;
    if (length < 12) {
      guidelines.push('Use short, punchy sentences.');
    } else if (length > 20) {
      guidelines.push('Use longer, more complex sentences.');
    } else {
      guidelines.push('Use moderate sentence lengths.');
    }
  }

  if (voiceAnalysis.vocabularyLevel === 'advanced') {
    guidelines.push('Use sophisticated vocabulary and industry jargon.');
  } else if (voiceAnalysis.vocabularyLevel === 'simple') {
    guidelines.push('Use simple, accessible language.');
  }

  if (voiceAnalysis.questionUsage === 'high') {
    guidelines.push('Include rhetorical questions to engage readers.');
  }

  if (voiceAnalysis.humorLevel === 'frequent') {
    guidelines.push('Include wit and humor where appropriate.');
  } else if (voiceAnalysis.humorLevel === 'subtle') {
    guidelines.push('Add subtle humor or clever observations.');
  }

  if (voiceAnalysis.structurePreference === 'bullets') {
    guidelines.push('Use bullet points and lists for structure.');
  } else if (voiceAnalysis.structurePreference === 'paragraphs') {
    guidelines.push('Use flowing paragraphs rather than lists.');
  }

  if (voiceAnalysis.emojiUsage === 'frequent') {
    guidelines.push('Include relevant emojis.');
  } else if (voiceAnalysis.emojiUsage === 'none') {
    guidelines.push('Avoid using emojis.');
  }

  if (voiceAnalysis.commonPhrases && Array.isArray(voiceAnalysis.commonPhrases)) {
    guidelines.push(`Consider using phrases like: ${(voiceAnalysis.commonPhrases as string[]).join(', ')}`);
  }

  return guidelines.join(' ');
}






