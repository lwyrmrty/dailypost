const TOPIC_NORMALIZATION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\benterprise ai adoption\b/i, replacement: 'AI Adoption' },
  { pattern: /\bai adoption\b/i, replacement: 'AI Adoption' },
  { pattern: /\bventure due diligence\b/i, replacement: 'Venture Investing' },
  { pattern: /\bvc due diligence\b/i, replacement: 'Venture Investing' },
  { pattern: /\bdeep tech investing\b/i, replacement: 'Deep Tech' },
  { pattern: /\bclimate tech funding\b/i, replacement: 'Climate Tech' },
  { pattern: /\bbiotech investment thesis\b/i, replacement: 'Biotech' },
  { pattern: /\bfounder market fit\b/i, replacement: 'Company Building' },
  { pattern: /\byc portfolio insights\b/i, replacement: 'Startups' },
  { pattern: /\bexit strategy planning\b/i, replacement: 'Company Building' },
  { pattern: /\boperator turned vc\b/i, replacement: 'Venture Investing' },
  { pattern: /\bai startup evaluation\b/i, replacement: 'AI' },
  { pattern: /\bbreakthrough technology trends\b/i, replacement: 'Tech Trends' },
];

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function sanitizeTopicLabel(topic: string) {
  return topic.replace(/\s+/g, ' ').trim();
}

export function sanitizeTopicLabels(topics: string[]) {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const topic of topics) {
    const nextTopic = sanitizeTopicLabel(topic);
    if (!nextTopic) {
      continue;
    }

    const dedupeKey = nextTopic.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    sanitized.push(nextTopic);
  }

  return sanitized;
}

export function normalizeTopicLabel(topic: string) {
  const cleaned = sanitizeTopicLabel(topic);
  if (!cleaned) {
    return cleaned;
  }

  for (const rule of TOPIC_NORMALIZATION_RULES) {
    if (rule.pattern.test(cleaned)) {
      return rule.replacement;
    }
  }

  const lower = cleaned.toLowerCase();
  if ((/\bventure\b|\bvc\b/.test(lower) && /\binvesting\b|\bdiligence\b|\bportfolio\b/.test(lower))) {
    return 'Venture Investing';
  }

  if (/\bdeep tech\b/.test(lower)) {
    return 'Deep Tech';
  }

  if (/\bclimate\b/.test(lower)) {
    return 'Climate Tech';
  }

  if (/\bbiotech\b/.test(lower)) {
    return 'Biotech';
  }

  if (/\bai\b/.test(lower) && /\badoption\b/.test(lower)) {
    return 'AI Adoption';
  }

  if (/\bai\b/.test(lower)) {
    return 'AI';
  }

  if (/\bmarket fit\b|\bcompany building\b|\bexit strategy\b|\bfounder\b/.test(lower)) {
    return 'Company Building';
  }

  if (/\byc\b|\bstartup\b/.test(lower)) {
    return 'Startups';
  }

  return cleaned.length <= 28 ? cleaned : toTitleCase(cleaned);
}

export function normalizeTopicLabels(topics: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const topic of topics) {
    const nextTopic = normalizeTopicLabel(topic);
    if (!nextTopic) {
      continue;
    }

    const dedupeKey = nextTopic.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(nextTopic);
  }

  return normalized;
}

const TOPIC_PROMPT_FALLBACKS = [
  (topic: string) => `Write me a post about the current state of ${topic}.`,
  (topic: string) => `Write me a post on why ${topic} matters more right now.`,
  (topic: string) => `Write me a post about a contrarian take in ${topic}.`,
  (topic: string) => `Write me a post on what most people misunderstand about ${topic}.`,
  (topic: string) => `Write me a post about an important shift happening in ${topic}.`,
  (topic: string) => `Write me a post on the biggest trend shaping ${topic} right now.`,
];

export function buildFallbackTopicPrompt(topic: string, priorPrompts: string[] = []) {
  const normalizedTopic = normalizeTopicLabel(topic);
  const used = new Set(priorPrompts.map((prompt) => prompt.trim().toLowerCase()));
  const nextPrompt = TOPIC_PROMPT_FALLBACKS
    .map((template) => template(normalizedTopic))
    .find((prompt) => !used.has(prompt.toLowerCase()));

  return nextPrompt ?? `Write me a post about ${normalizedTopic}.`;
}
