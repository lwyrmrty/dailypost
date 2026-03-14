import { db } from '@/lib/db';
import { sources, SourceType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseFeed, filterRecentItems, RSSItem } from './rss-parser';
import { fetchRedditStories, isRedditUrl } from './reddit-scraper';
import { fetchXStories, isXUrl } from './x-scraper';
import { fetchLinkedInStories, isLinkedInUrl } from './linkedin-scraper';

export interface NewsStory {
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  source: string;
  topic?: string;
  priority: number;
}

const TOPIC_SYNONYMS: Record<string, string[]> = {
  ai: ['ai', 'artificial intelligence', 'llm', 'machine learning', 'ml', 'foundation model'],
  biotech: ['biotech', 'biology', 'genomics', 'crispr', 'life science'],
  climate: ['climate', 'clean energy', 'battery', 'solar', 'wind', 'carbon', 'fusion'],
  cybersecurity: ['cybersecurity', 'security', 'breach', 'ransomware', 'malware'],
  fintech: ['fintech', 'payments', 'banking', 'financial technology'],
  healthcare: ['healthcare', 'health tech', 'medical', 'pharma'],
  saas: ['saas', 'software', 'b2b software', 'enterprise software'],
  product: ['product', 'product management', 'user experience'],
  sales: ['sales', 'go to market', 'gtm', 'revenue'],
  marketing: ['marketing', 'brand', 'demand gen', 'growth marketing'],
  leadership: ['leadership', 'management', 'team building'],
  hiring: ['hiring', 'recruiting', 'talent'],
  startups: ['startup', 'startups', 'founder', 'venture-backed'],
  company_building: ['company building', 'building companies', 'scaling', 'operator'],
  vc_investing: ['venture capital', 'vc', 'investing', 'funding', 'series a', 'series b'],
  operations: ['operations', 'ops', 'execution'],
  industry_trends: ['industry trend', 'market trend', 'category shift'],
  innovation: ['innovation', 'breakthrough', 'emerging technology'],
  strategy: ['strategy', 'competitive advantage', 'positioning'],
  growth: ['growth', 'scale', 'expansion'],
  customer_success: ['customer success', 'retention', 'expansion revenue'],
  entrepreneurship: ['entrepreneurship', 'founders', 'building', 'starting a company'],
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'gpt', 'llm', 'deep learning', 'foundation model'],
  'Robotics': ['robot', 'robotics', 'automation', 'humanoid', 'manipulation'],
  'Space': ['space', 'satellite', 'rocket', 'nasa', 'spacex', 'orbit', 'launch', 'starship'],
  'Climate Tech': ['climate', 'carbon', 'clean energy', 'solar', 'wind', 'battery', 'ev', 'sustainability', 'fusion', 'nuclear'],
  'Biotech': ['biotech', 'biology', 'genomic', 'crispr', 'pharmaceutical', 'synthetic biology', 'life science'],
  'Quantum': ['quantum', 'qubit', 'superposition', 'entanglement', 'quantum computing'],
  'Semiconductors': ['chip', 'semiconductor', 'nvidia', 'processor', 'gpu', 'asic', 'fab'],
  'Autonomous Systems': ['autonomous', 'drone', 'self-driving', 'av', 'lidar'],
  'Cybersecurity': ['cyber', 'security', 'hack', 'breach', 'ransomware', 'malware'],
  'Funding': ['funding', 'raised', 'series', 'investment', 'venture', 'vc', 'million', 'billion'],
  'Deep Tech': ['deep tech', 'hard tech', 'frontier', 'breakthrough', 'science'],
};

export function categorizeTopic(text: string): string {
  const lower = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return topic;
    }
  }
  
  return 'General';
}

function normalizeToken(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '_');
}

function expandTopicKeywords(topic: string): string[] {
  const normalized = normalizeToken(topic);
  const parts = normalized.split('_').filter(Boolean);
  const synonyms = TOPIC_SYNONYMS[normalized] || [];

  return Array.from(new Set([
    normalized.replace(/_/g, ' '),
    ...parts,
    ...synonyms,
  ])).filter((keyword) => keyword.length > 1);
}

function scoreStoryForUser(story: NewsStory, topics: string[], avoidTopics: string[] = []): number {
  const haystack = `${story.title} ${story.summary} ${story.topic || ''}`.toLowerCase();
  let score = story.priority * 2;

  for (const topic of topics) {
    const keywords = expandTopicKeywords(topic);
    let matchedTopic = false;

    for (const keyword of keywords) {
      if (!haystack.includes(keyword.toLowerCase())) {
        continue;
      }

      matchedTopic = true;
      score += story.title.toLowerCase().includes(keyword.toLowerCase()) ? 3 : 1.5;
    }

    if (matchedTopic) {
      score += 2;
    }
  }

  for (const avoidTopic of avoidTopics) {
    const keywords = expandTopicKeywords(avoidTopic);
    if (keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      score -= 6;
    }
  }

  const ageHours = Math.max(0, (Date.now() - story.publishedAt.getTime()) / (1000 * 60 * 60));
  if (ageHours <= 12) {
    score += 3;
  } else if (ageHours <= 24) {
    score += 2;
  } else if (ageHours <= 48) {
    score += 1;
  }

  if (/\b(raise[ds]?|funding|series [abcde]|acquisition|launch|breakthrough|announces?)\b/i.test(haystack)) {
    score += 1.5;
  }

  return score;
}

/**
 * Detect source type from URL
 */
export function detectSourceType(url: string): SourceType {
  if (isRedditUrl(url)) return 'reddit';
  if (isXUrl(url)) return 'x';
  if (isLinkedInUrl(url)) return 'linkedin';
  return 'rss';
}

/**
 * Fetch stories from an RSS source
 */
async function fetchRssStories(
  sourceUrl: string,
  sourceName: string | null,
  priority: number
): Promise<NewsStory[]> {
  const stories: NewsStory[] = [];
  
  try {
    const parsed = await parseFeed(sourceUrl);
    if (!parsed) return stories;

    const recentItems = filterRecentItems(parsed.items, 48);

    recentItems.slice(0, 10).forEach((item: RSSItem) => {
      stories.push({
        title: item.title,
        summary: item.contentSnippet || item.content?.slice(0, 300) || '',
        url: item.link,
        publishedAt: new Date(item.pubDate),
        source: sourceName || parsed.title,
        topic: categorizeTopic(item.title + ' ' + item.contentSnippet),
        priority,
      });
    });
  } catch (error) {
    console.error(`Failed to fetch RSS ${sourceUrl}:`, error);
  }
  
  return stories;
}

/**
 * Fetch stories from a source based on its type
 */
async function fetchStoriesFromSource(
  sourceType: SourceType,
  sourceUrl: string,
  sourceName: string | null,
  priority: number
): Promise<NewsStory[]> {
  switch (sourceType) {
    case 'reddit':
      return fetchRedditStories(sourceUrl, sourceName, priority);
    case 'x':
      return fetchXStories(sourceUrl, sourceName, priority);
    case 'linkedin':
      return fetchLinkedInStories(sourceUrl, sourceName, priority);
    case 'rss':
    default:
      return fetchRssStories(sourceUrl, sourceName, priority);
  }
}

export async function aggregateNews(userId: string): Promise<NewsStory[]> {
  // Get user's active sources
  const userSources = await db.query.sources.findMany({
    where: eq(sources.userId, userId),
  });

  const activeSources = userSources.filter(s => s.isActive);
  
  // Only use user's explicit sources - no defaults
  if (activeSources.length === 0) {
    console.log(`No active sources for user ${userId}, skipping aggregation`);
    return [];
  }
  
  const sourcesToFetch = activeSources.map(s => ({
    type: s.sourceType as SourceType,
    url: s.sourceUrl,
    name: s.sourceName,
    priority: s.priority,
  }));

  const stories: NewsStory[] = [];

  // Fetch from all sources in parallel
  const fetchPromises = sourcesToFetch.map(source =>
    fetchStoriesFromSource(source.type, source.url, source.name, source.priority)
  );
  
  const results = await Promise.allSettled(fetchPromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      stories.push(...result.value);
    }
  }

  // Deduplicate and sort
  const uniqueStories = deduplicateStoriesByTitle(stories);
  
  return uniqueStories
    .sort((a, b) => {
      // Sort by priority first, then by recency
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    })
    .slice(0, 30);
}

function deduplicateStoriesByTitle(stories: NewsStory[]): NewsStory[] {
  const seen = new Set<string>();
  
  return stories.filter(story => {
    const key = story.title.toLowerCase().trim();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function getStoriesForTopics(
  userId: string,
  topics: string[],
  avoidTopics: string[] = []
): Promise<NewsStory[]> {
  const allStories = await aggregateNews(userId);

  return allStories
    .map(story => ({
      ...story,
      relevanceScore: scoreStoryForUser(story, topics, avoidTopics),
    }))
    .filter((story) => story.relevanceScore > 0)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });
}

// Note: Default/suggested sources are now defined in:
// app/(dashboard)/onboarding/components/Step8_Sources.tsx
// Users explicitly choose their sources during onboarding
