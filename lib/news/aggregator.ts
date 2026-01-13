import { db } from '@/lib/db';
import { sources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseFeed, filterRecentItems, deduplicateItems, RSSItem } from './rss-parser';

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

export async function aggregateNews(userId: string): Promise<NewsStory[]> {
  // Get user's active sources
  const userSources = await db.query.sources.findMany({
    where: eq(sources.userId, userId),
  });

  const activeRssSources = userSources.filter(s => s.sourceType === 'rss' && s.isActive);
  
  // If no custom sources, use defaults
  const feedUrls = activeRssSources.length > 0
    ? activeRssSources.map(s => ({ url: s.sourceUrl, name: s.sourceName, priority: s.priority }))
    : DEFAULT_SOURCES.map(s => ({ url: s.sourceUrl, name: s.sourceName, priority: s.priority }));

  const stories: NewsStory[] = [];

  for (const feed of feedUrls) {
    try {
      const parsed = await parseFeed(feed.url);
      if (!parsed) continue;

      // Get recent items
      const recentItems = filterRecentItems(parsed.items, 48);

      recentItems.slice(0, 10).forEach((item: RSSItem) => {
        stories.push({
          title: item.title,
          summary: item.contentSnippet || item.content?.slice(0, 300) || '',
          url: item.link,
          publishedAt: new Date(item.pubDate),
          source: feed.name || parsed.title,
          topic: categorizeTopic(item.title + ' ' + item.contentSnippet),
          priority: feed.priority,
        });
      });
    } catch (error) {
      console.error(`Failed to fetch ${feed.url}:`, error);
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

const DEFAULT_SOURCES = [
  {
    sourceType: 'rss',
    sourceUrl: 'https://techcrunch.com/feed/',
    sourceName: 'TechCrunch',
    priority: 5,
  },
  {
    sourceType: 'rss',
    sourceUrl: 'https://www.theverge.com/rss/index.xml',
    sourceName: 'The Verge',
    priority: 4,
  },
  {
    sourceType: 'rss',
    sourceUrl: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    sourceName: 'Ars Technica',
    priority: 4,
  },
  {
    sourceType: 'rss',
    sourceUrl: 'https://www.wired.com/feed/rss',
    sourceName: 'Wired',
    priority: 3,
  },
  {
    sourceType: 'rss',
    sourceUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
    sourceName: 'MIT News - AI',
    priority: 5,
  },
  {
    sourceType: 'rss',
    sourceUrl: 'https://spectrum.ieee.org/feeds/feed.rss',
    sourceName: 'IEEE Spectrum',
    priority: 4,
  },
];

export async function initializeDefaultSources(userId: string) {
  // Check if user already has sources
  const existingSources = await db.query.sources.findMany({
    where: eq(sources.userId, userId),
  });

  if (existingSources.length > 0) {
    return; // User already has sources
  }

  // Add default sources
  await db.insert(sources).values(
    DEFAULT_SOURCES.map(s => ({
      ...s,
      userId,
      isActive: true,
    }))
  );
}





