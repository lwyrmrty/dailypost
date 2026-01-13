import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'DailyPost/1.0',
  },
  customFields: {
    item: ['media:content', 'media:thumbnail', 'dc:creator'],
  },
});

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  creator?: string;
  categories?: string[];
}

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
}

export async function parseFeed(feedUrl: string): Promise<ParsedFeed | null> {
  try {
    const feed = await parser.parseURL(feedUrl);
    
    return {
      title: feed.title || 'Unknown Feed',
      description: feed.description || '',
      link: feed.link || feedUrl,
      items: (feed.items || []).map(item => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        content: item.content || '',
        contentSnippet: item.contentSnippet || item.content?.slice(0, 300) || '',
        creator: item['dc:creator'] || item.creator,
        categories: item.categories,
      })),
    };
  } catch (error) {
    console.error(`Failed to parse feed ${feedUrl}:`, error);
    return null;
  }
}

export async function parseMultipleFeeds(
  feedUrls: string[]
): Promise<Map<string, ParsedFeed>> {
  const results = new Map<string, ParsedFeed>();
  
  const promises = feedUrls.map(async (url) => {
    const feed = await parseFeed(url);
    if (feed) {
      results.set(url, feed);
    }
  });
  
  await Promise.allSettled(promises);
  
  return results;
}

export function filterRecentItems(
  items: RSSItem[],
  hoursBack: number = 48
): RSSItem[] {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursBack);
  
  return items.filter(item => {
    const pubDate = new Date(item.pubDate);
    return pubDate >= cutoff;
  });
}

export function deduplicateItems(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>();
  
  return items.filter(item => {
    // Create a simple hash of title + link
    const key = `${item.title.toLowerCase().trim()}|${item.link}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}






