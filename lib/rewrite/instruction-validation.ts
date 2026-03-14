const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'had',
  'has', 'have', 'he', 'her', 'hers', 'him', 'his', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'of', 'on', 'or',
  'our', 'ours', 'she', 'so', 'that', 'the', 'their', 'theirs', 'them', 'there',
  'these', 'they', 'this', 'those', 'to', 'too', 'us', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your', 'yours',
]);

function normalizeText(content: string) {
  return content
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAnchorTerms(content: string) {
  return normalizeText(content)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function dedupeAdditions(additions: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const addition of additions) {
    const normalized = normalizeText(addition);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(addition.trim());
  }

  return output;
}

function cleanAdditionCandidate(candidate: string) {
  return candidate
    .replace(/^(that|the fact that)\s+/i, '')
    .replace(/^(all\s+\d+\s+to|all\s+three\s+to)\s+/i, '')
    .replace(/^(the draft|the drafts|option\s+\d+)\s+/i, '')
    .replace(/[.?!]+$/g, '')
    .trim();
}

export function extractRequiredAdditions(instruction: string) {
  const sentences = instruction
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const additions: string[] = [];
  let priorSentenceWasAddition = false;

  for (const sentence of sentences) {
    const triggerMatch = sentence.match(/\b(include|mention|add|make sure (?:it|they|this|these|the draft|the drafts)?\s*(?:says|say|includes|include|mentions|mention))\b/i);

    if (triggerMatch?.index !== undefined) {
      const rawCandidate = sentence.slice(triggerMatch.index + triggerMatch[0].length);
      const cleaned = cleanAdditionCandidate(rawCandidate);
      if (cleaned) {
        additions.push(cleaned);
        priorSentenceWasAddition = true;
        continue;
      }
    }

    if (priorSentenceWasAddition && /^(and|also|plus)\b/i.test(sentence)) {
      const cleaned = cleanAdditionCandidate(sentence.replace(/^(and|also|plus)\s+/i, ''));
      if (cleaned) {
        additions.push(cleaned);
        priorSentenceWasAddition = true;
        continue;
      }
    }

    priorSentenceWasAddition = false;
  }

  return dedupeAdditions(additions);
}

export function draftIncludesRequiredAddition(content: string, addition: string) {
  const normalizedContent = normalizeText(content);
  const normalizedAddition = normalizeText(addition);

  if (!normalizedContent || !normalizedAddition) {
    return false;
  }

  if (normalizedContent.includes(normalizedAddition)) {
    return true;
  }

  const anchorTerms = getAnchorTerms(addition);
  if (anchorTerms.length === 0) {
    return false;
  }

  const matchingAnchors = anchorTerms.filter((term) => normalizedContent.includes(term));
  const requiredMatches = anchorTerms.length <= 3
    ? anchorTerms.length
    : Math.max(2, Math.ceil(anchorTerms.length * 0.6));

  return matchingAnchors.length >= requiredMatches;
}

export function getMissingRequiredAdditions(content: string, requiredAdditions: string[]) {
  return requiredAdditions.filter((addition) => !draftIncludesRequiredAddition(content, addition));
}
