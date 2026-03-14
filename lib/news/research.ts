import * as cheerio from 'cheerio';
import { generateWithClaude } from '@/lib/claude/client';
import { ingestArticleUrl } from './article-ingest';

export interface ResearchSource {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  summary?: string;
  keyPoints?: string[];
  publishedDate?: string;
}

export interface ResearchBrief {
  query: string;
  summary: string;
  keyFindings: string[];
  sources: ResearchSource[];
}

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

const SEARCH_RESULT_LIMIT = 6;
const INGESTED_SOURCE_LIMIT = 3;
const RESEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

const researchCache = new Map<string, { expiresAt: number; value: ResearchBrief }>();

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

function unwrapDuckDuckGoUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl, 'https://duckduckgo.com');
    const wrapped = parsed.searchParams.get('uddg');
    return wrapped ? decodeURIComponent(wrapped) : parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function looksLikeBroadResearchRequest(message: string) {
  const lower = message.toLowerCase();
  const wantsNewContent =
    /\b(write|create|generate|draft|make|help me)\b/.test(lower) &&
    /\b(post|article|thought piece|linkedin|about|on)\b/.test(lower);
  const wantsExplicitlyOnePost = /\b(one|single|just one|a single)\b/i.test(lower);
  const looksLikePastedSource = message.length > 600 || message.includes('\n\n');
  const referencesConcreteSource =
    /https?:\/\//i.test(message) || /\baccording to\b|\bquoted\b|\bverbatim\b/i.test(lower);
  const editIntent = /\b(shorter|longer|rewrite|rephrase|edit|revise|tighten|condense|expand)\b/.test(lower);
  const xSpecificIntent = /\bx\b|twitter|tweet|thread/i.test(lower);

  return (
    wantsNewContent &&
    !wantsExplicitlyOnePost &&
    !looksLikePastedSource &&
    !referencesConcreteSource &&
    !editIntent &&
    !xSpecificIntent
  );
}

export function wantsExplicitlySinglePost(message: string): boolean {
  const lower = message.toLowerCase();
  const hasCreateIntent = /\b(write|create|generate|draft|make|help me)\b/.test(lower);
  const hasOneOrSingle = /\b(one|single|just one|a single)\b/i.test(lower);
  return hasCreateIntent && hasOneOrSingle;
}

export function extractResearchQuery(message: string) {
  const cleaned = message
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!]+$/, '');

  const match = cleaned.match(
    /(?:write|help me write|create|generate|draft|make)(?: me)?(?: a)?(?: single)?(?: one)?(?: linkedin)?(?: post)?(?: article)?(?: about| on)?\s+(.+)$/i
  );
  if (match?.[1]) {
    const topic = match[1].trim();
    if (topic.length > 3) return topic;
  }

  return cleaned;
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DailyPost/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('a.result__a').each((_, element) => {
    if (results.length >= SEARCH_RESULT_LIMIT) {
      return false;
    }

    const title = $(element).text().replace(/\s+/g, ' ').trim();
    const href = $(element).attr('href');
    const url = href ? unwrapDuckDuckGoUrl(href) : '';
    const snippet = $(element).closest('.result').find('.result__snippet').first().text().replace(/\s+/g, ' ').trim();

    if (!title || !url.startsWith('http')) {
      return;
    }

    results.push({
      title,
      url,
      snippet: snippet || undefined,
    });
  });

  return results;
}

function buildFallbackBrief(query: string, sources: ResearchSource[]): ResearchBrief {
  const keyFindings = sources
    .flatMap((source) => source.keyPoints || [])
    .filter(Boolean)
    .slice(0, 4);

  const summary = keyFindings.length > 0
    ? `I pulled a few recent sources on ${query}. The common threads are: ${keyFindings.slice(0, 2).join(' ')}`
    : `I pulled a few recent sources on ${query} and summarized the highest-signal themes below.`;

  return {
    query,
    summary,
    keyFindings: keyFindings.length > 0
      ? keyFindings
      : sources.slice(0, 3).map((source) => source.title),
    sources,
  };
}

async function synthesizeBrief(query: string, sources: ResearchSource[]): Promise<ResearchBrief> {
  const prompt = `You are preparing a short research brief for a writing assistant.

TOPIC:
${query}

SOURCES:
${sources.map((source, index) => `
Source ${index + 1}
Title: ${source.title}
Domain: ${source.domain}
URL: ${source.url}
Snippet: ${source.snippet || 'N/A'}
Summary: ${source.summary || 'N/A'}
Key points:
${(source.keyPoints || []).map((point) => `- ${point}`).join('\n') || '- N/A'}
`).join('\n')}

Write a concise research brief.

Rules:
- Keep it high-level and useful for drafting a social post
- Focus on current themes, patterns, and tensions
- Do not overstate certainty
- Keep the summary to 2-3 sentences
- Return 3-5 key findings max

Return valid JSON in exactly this shape:
{
  "summary": "...",
  "keyFindings": ["...", "..."]
}

Return ONLY valid JSON.`;

  try {
    const response = await generateWithClaude(prompt, undefined, 900);
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');
    const jsonText = firstBrace !== -1 && lastBrace !== -1
      ? response.slice(firstBrace, lastBrace + 1)
      : response;
    const parsed = JSON.parse(jsonText) as { summary?: string; keyFindings?: string[] };

    if (parsed.summary?.trim() && parsed.keyFindings?.length) {
      return {
        query,
        summary: parsed.summary.trim(),
        keyFindings: parsed.keyFindings.map((item) => item.trim()).filter(Boolean).slice(0, 5),
        sources,
      };
    }
  } catch (error) {
    console.error('Failed to synthesize research brief:', error);
  }

  return buildFallbackBrief(query, sources);
}

export async function researchTopicPrompt(message: string): Promise<ResearchBrief | null> {
  const query = extractResearchQuery(message);
  if (!query) {
    return null;
  }

  const cacheKey = query.toLowerCase();
  const cached = researchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const searchResults = await searchDuckDuckGo(query);
  const selectedResults: SearchResult[] = [];
  const seenDomains = new Set<string>();

  for (const result of searchResults) {
    const domain = getDomain(result.url);
    if (seenDomains.has(domain)) {
      continue;
    }

    seenDomains.add(domain);
    selectedResults.push(result);

    if (selectedResults.length >= INGESTED_SOURCE_LIMIT) {
      break;
    }
  }

  const sources: ResearchSource[] = [];
  for (const result of selectedResults) {
    const ingested = await ingestArticleUrl(result.url);
    if (!ingested.ok) {
      continue;
    }

    sources.push({
      title: ingested.article.title,
      url: ingested.article.url,
      domain: getDomain(ingested.article.url),
      snippet: result.snippet,
      summary: ingested.article.summary,
      keyPoints: ingested.article.keyPoints.slice(0, 4),
      publishedDate: ingested.article.publishedDate,
    });
  }

  if (sources.length === 0) {
    return null;
  }

  const brief = await synthesizeBrief(query, sources);
  researchCache.set(cacheKey, {
    expiresAt: Date.now() + RESEARCH_CACHE_TTL_MS,
    value: brief,
  });

  return brief;
}
