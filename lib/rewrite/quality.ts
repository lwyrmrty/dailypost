export type LengthIntent = 'none' | 'shorter' | 'half' | 'longer';

function normalizeText(content: string) {
  return content
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWordTokens(content: string) {
  return normalizeText(content).split(' ').filter(Boolean);
}

function getNgrams(tokens: string[], size: number) {
  if (tokens.length < size) {
    return new Set<string>();
  }

  const ngrams = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    ngrams.add(tokens.slice(index, index + size).join(' '));
  }

  return ngrams;
}

function getJaccardOverlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) {
      intersection += 1;
    }
  }

  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function countWords(content: string) {
  return content.split(/\s+/).filter(Boolean).length;
}

export function detectLengthIntent(lowerMessage: string): LengthIntent {
  if (/half|50%|fifty percent/.test(lowerMessage)) {
    return 'half';
  }

  if (/\b(shorter|shorten|trim|tighter|tighten|cut|reduce|condense|more concise|less wordy)\b/.test(lowerMessage)) {
    return 'shorter';
  }

  if (/\b(longer|expand|lengthen|more detail|more detailed|add detail|flesh out)\b/.test(lowerMessage)) {
    return 'longer';
  }

  return 'none';
}

export function getMaxWordCount(originalWordCount: number, intent: LengthIntent) {
  if (intent === 'half') {
    return Math.max(1, Math.floor(originalWordCount * 0.6));
  }

  if (intent === 'shorter') {
    return Math.max(1, Math.floor(originalWordCount * 0.8));
  }

  return originalWordCount;
}

export function exceedsLengthIntent(
  originalContent: string,
  editedContent: string,
  intent: LengthIntent
) {
  if (intent !== 'shorter' && intent !== 'half') {
    return false;
  }

  const originalWordCount = countWords(originalContent);
  const editedWordCount = countWords(editedContent);
  const maxWordCount = getMaxWordCount(originalWordCount, intent);

  return editedWordCount > originalWordCount || editedWordCount > maxWordCount;
}

export function trimToWordLimit(content: string, maxWords: number) {
  const normalized = content.trim();
  if (!normalized) {
    return normalized;
  }

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];

  for (const sentence of sentences) {
    const next = [...kept, sentence].join(' ').trim();
    if (countWords(next) <= maxWords) {
      kept.push(sentence);
      continue;
    }

    break;
  }

  if (kept.length > 0) {
    return kept.join(' ').trim();
  }

  return normalized.split(/\s+/).slice(0, maxWords).join(' ').trim();
}

export function measureSourceOverlap(sourceContent: string, candidateContent: string) {
  const sourceTokens = getWordTokens(sourceContent);
  const candidateTokens = getWordTokens(candidateContent);
  const sourceTrigrams = getNgrams(sourceTokens, 3);
  const candidateTrigrams = getNgrams(candidateTokens, 3);
  const sourceFourgrams = getNgrams(sourceTokens, 4);
  const candidateFourgrams = getNgrams(candidateTokens, 4);

  const trigramOverlap = getJaccardOverlap(sourceTrigrams, candidateTrigrams);
  const fourgramOverlap = getJaccardOverlap(sourceFourgrams, candidateFourgrams);

  let longestSharedPhrase = 0;
  for (const phrase of candidateFourgrams) {
    if (sourceFourgrams.has(phrase)) {
      longestSharedPhrase = Math.max(longestSharedPhrase, phrase.split(' ').length);
    }
  }

  return {
    trigramOverlap,
    fourgramOverlap,
    longestSharedPhrase,
  };
}

export function isNearVerbatimRewrite(sourceContent: string, candidateContent: string) {
  const normalizedSource = normalizeText(sourceContent);
  const normalizedCandidate = normalizeText(candidateContent);

  if (!normalizedSource || !normalizedCandidate) {
    return false;
  }

  if (normalizedSource === normalizedCandidate) {
    return true;
  }

  const metrics = measureSourceOverlap(sourceContent, candidateContent);
  return (
    metrics.fourgramOverlap >= 0.45 ||
    metrics.trigramOverlap >= 0.6 ||
    metrics.longestSharedPhrase >= 12
  );
}
