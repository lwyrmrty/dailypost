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
  topics: string[]
): Promise<NewsStory[]> {
  const allStories = await aggregateNews(userId);
  
  // Filter and boost stories matching user topics
  return allStories
    .map(story => ({
      ...story,
      priority: topics.some(t => 
        story.topic?.toLowerCase().includes(t.toLowerCase()) ||
        story.title.toLowerCase().includes(t.toLowerCase())
      ) ? story.priority + 2 : story.priority,
    }))
    .sort((a, b) => b.priority - a.priority);
}

// Note: Default/suggested sources are now defined in:
// app/(dashboard)/onboarding/components/Step8_Sources.tsx
// Users explicitly choose their sources during onboarding
