import { parseFeed, filterRecentItems, RSSItem } from './rss-parser';
import { NewsStory, categorizeTopic } from './aggregator';

/**
 * X/Twitter scraper using RSS bridges (Nitter, RSSHub)
 * 
 * Since X API costs $100/month, we use free RSS bridges:
 * - Nitter instances (community-maintained)
 * - RSSHub (self-hosted RSS generator)
 * 
 * URL patterns:
 * - twitter.com/username or x.com/username
 * - Converted to nitter.net/username/rss
 */

// Nitter instances to try (in order of reliability)
const NITTER_INSTANCES = [
  'nitter.privacydev.net',
  'nitter.poast.org',
  'nitter.net',
  'nitter.cz',
];

// RSSHub instances as fallback
const RSSHUB_INSTANCES = [
  'rsshub.app',
];

/**
 * Extract username from X/Twitter URL
 */
export function extractXUsername(url: string): string | null {
  // Match twitter.com/username or x.com/username
  const match = url.match(/(?:twitter\.com|x\.com)\/(@)?([a-zA-Z0-9_]+)/i);
  if (match) {
    return match[2];
  }
  
  // Already just a username
  if (/^@?[a-zA-Z0-9_]+$/.test(url)) {
    return url.replace('@', '');
  }
  
  return null;
}

/**
 * Check if a URL is an X/Twitter URL
 */
export function isXUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(twitter\.com|x\.com)/.test(url) ||
         /^@?[a-zA-Z0-9_]+$/.test(url);
}

/**
 * Try to fetch RSS from multiple Nitter instances
 */
async function tryNitterInstances(username: string): Promise<{ items: RSSItem[]; title: string } | null> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const rssUrl = `https://${instance}/${username}/rss`;
      const parsed = await parseFeed(rssUrl);
      
      if (parsed && parsed.items.length > 0) {
        console.log(`Successfully fetched X feed for @${username} from ${instance}`);
        return parsed;
      }
    } catch (error) {
      console.log(`Nitter instance ${instance} failed for @${username}, trying next...`);
    }
  }
  
  return null;
}

/**
 * Try RSSHub as fallback
 */
async function tryRSSHub(username: string): Promise<{ items: RSSItem[]; title: string } | null> {
  for (const instance of RSSHUB_INSTANCES) {
    try {
      const rssUrl = `https://${instance}/twitter/user/${username}`;
      const parsed = await parseFeed(rssUrl);
      
      if (parsed && parsed.items.length > 0) {
        console.log(`Successfully fetched X feed for @${username} from RSSHub`);
        return parsed;
      }
    } catch (error) {
      console.log(`RSSHub instance ${instance} failed for @${username}`);
    }
  }
  
  return null;
}

/**
 * Fetch stories from an X/Twitter account
 */
export async function fetchXStories(
  sourceUrl: string,
  sourceName: string | null,
  priority: number
): Promise<NewsStory[]> {
  const stories: NewsStory[] = [];
  
  const username = extractXUsername(sourceUrl);
  if (!username) {
    console.error(`Could not extract username from X URL: ${sourceUrl}`);
    return stories;
  }
  
  try {
    // Try Nitter first, then RSSHub
    let parsed = await tryNitterInstances(username);
    
    if (!parsed) {
      parsed = await tryRSSHub(username);
    }
    
    if (!parsed) {
      console.error(`All RSS bridges failed for @${username}`);
      return stories;
    }
    
    // Get recent items (tweets from last 72 hours - X content is more time-sensitive)
    const recentItems = filterRecentItems(parsed.items, 72);
    
    const displayName = sourceName || `@${username}`;
    
    recentItems.slice(0, 10).forEach((item: RSSItem) => {
      // Extract tweet content
      const content = extractTweetContent(item.content || item.contentSnippet || '');
      
      // Skip retweets unless they add commentary
      if (isRetweet(item.title || content) && !hasCommentary(item.title || '')) {
        return;
      }
      
      stories.push({
        title: truncateTweetTitle(content),
        summary: content,
        url: item.link,
        publishedAt: new Date(item.pubDate),
        source: displayName,
        topic: categorizeTopic(content),
        priority,
      });
    });
  } catch (error) {
    console.error(`Failed to fetch X stories for ${sourceUrl}:`, error);
  }
  
  return stories;
}

/**
 * Extract readable content from tweet HTML
 */
function extractTweetContent(htmlContent: string): string {
  return htmlContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

/**
 * Create a title from tweet content (first line or first 100 chars)
 */
function truncateTweetTitle(content: string): string {
  const firstLine = content.split('\n')[0];
  if (firstLine.length <= 100) {
    return firstLine;
  }
  return firstLine.slice(0, 97) + '...';
}

/**
 * Check if a tweet is a retweet
 */
function isRetweet(content: string): boolean {
  return content.startsWith('RT @') || content.startsWith('RT:');
}

/**
 * Check if a retweet has added commentary
 */
function hasCommentary(title: string): boolean {
  // If the title has text before "RT @", it's a quote tweet with commentary
  const rtIndex = title.indexOf('RT @');
  return rtIndex > 5; // Some meaningful text before the RT
}

/**
 * Suggested X accounts for tech/startup content
 */
export const X_DEFAULT_SOURCES = [
  {
    sourceType: 'x' as const,
    sourceUrl: 'https://x.com/elonmusk',
    sourceName: '@elonmusk',
    priority: 4,
  },
  {
    sourceType: 'x' as const,
    sourceUrl: 'https://x.com/sama',
    sourceName: '@sama',
    priority: 5,
  },
  {
    sourceType: 'x' as const,
    sourceUrl: 'https://x.com/kabornoah',
    sourceName: '@kabornoah',
    priority: 4,
  },
];
