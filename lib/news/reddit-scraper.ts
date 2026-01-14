import { parseFeed, filterRecentItems, RSSItem } from './rss-parser';
import { NewsStory, categorizeTopic } from './aggregator';

/**
 * Reddit has native RSS support. This module handles URL formatting
 * and parsing Reddit-specific content.
 * 
 * URL patterns:
 * - Subreddit: https://reddit.com/r/technology.rss
 * - User posts: https://reddit.com/user/username.rss
 * - Search: https://reddit.com/search.rss?q=AI
 * - Multi: https://reddit.com/r/tech+programming.rss
 */

/**
 * Convert a Reddit URL to its RSS feed URL
 */
export function toRedditRssUrl(url: string): string {
  // Remove trailing slashes
  let cleanUrl = url.replace(/\/+$/, '');
  
  // Already an RSS URL
  if (cleanUrl.endsWith('.rss')) {
    return cleanUrl;
  }
  
  // Handle different Reddit URL formats
  // www.reddit.com, old.reddit.com, reddit.com
  cleanUrl = cleanUrl.replace(/^https?:\/\/(www\.|old\.)?reddit\.com/, 'https://www.reddit.com');
  
  // Add .rss extension
  // Check if URL has query params
  if (cleanUrl.includes('?')) {
    // For search URLs, insert .rss before the ?
    return cleanUrl.replace('?', '.rss?');
  }
  
  return cleanUrl + '.rss';
}

/**
 * Check if a URL is a Reddit URL
 */
export function isRedditUrl(url: string): boolean {
  return /^https?:\/\/(www\.|old\.)?reddit\.com/.test(url);
}

/**
 * Extract subreddit or username from Reddit URL
 */
export function parseRedditUrl(url: string): { type: 'subreddit' | 'user' | 'search' | 'other'; name: string } {
  const subredditMatch = url.match(/reddit\.com\/r\/([^\/\?\.\s]+)/i);
  if (subredditMatch) {
    return { type: 'subreddit', name: `r/${subredditMatch[1]}` };
  }
  
  const userMatch = url.match(/reddit\.com\/user\/([^\/\?\.\s]+)/i);
  if (userMatch) {
    return { type: 'user', name: `u/${userMatch[1]}` };
  }
  
  const searchMatch = url.match(/reddit\.com\/search/i);
  if (searchMatch) {
    return { type: 'search', name: 'Reddit Search' };
  }
  
  return { type: 'other', name: 'Reddit' };
}

/**
 * Fetch stories from a Reddit source
 */
export async function fetchRedditStories(
  sourceUrl: string,
  sourceName: string | null,
  priority: number
): Promise<NewsStory[]> {
  const stories: NewsStory[] = [];
  
  try {
    const rssUrl = toRedditRssUrl(sourceUrl);
    const parsed = await parseFeed(rssUrl);
    
    if (!parsed) {
      console.error(`Failed to parse Reddit feed: ${rssUrl}`);
      return stories;
    }
    
    // Get recent items (Reddit posts from last 48 hours)
    const recentItems = filterRecentItems(parsed.items, 48);
    
    // Parse Reddit URL to get a better source name if not provided
    const { name: parsedName } = parseRedditUrl(sourceUrl);
    const displayName = sourceName || parsedName || parsed.title;
    
    recentItems.slice(0, 15).forEach((item: RSSItem) => {
      // Reddit RSS includes full HTML content, extract text
      const summary = extractRedditContent(item.content || item.contentSnippet || '');
      
      stories.push({
        title: cleanRedditTitle(item.title),
        summary,
        url: item.link,
        publishedAt: new Date(item.pubDate),
        source: displayName,
        topic: categorizeTopic(item.title + ' ' + summary),
        priority,
      });
    });
  } catch (error) {
    console.error(`Failed to fetch Reddit stories from ${sourceUrl}:`, error);
  }
  
  return stories;
}

/**
 * Clean Reddit post titles (remove common prefixes like [OC], etc.)
 */
function cleanRedditTitle(title: string): string {
  return title
    .replace(/^\[[\w\s]+\]\s*/i, '') // Remove [OC], [News], etc.
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract readable content from Reddit HTML
 */
function extractRedditContent(htmlContent: string): string {
  // Simple HTML tag removal for Reddit content
  return htmlContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

/**
 * Suggested Reddit sources for tech/startup content
 */
export const REDDIT_DEFAULT_SOURCES = [
  {
    sourceType: 'reddit',
    sourceUrl: 'https://reddit.com/r/technology',
    sourceName: 'r/technology',
    priority: 4,
  },
  {
    sourceType: 'reddit',
    sourceUrl: 'https://reddit.com/r/artificial',
    sourceName: 'r/artificial',
    priority: 4,
  },
  {
    sourceType: 'reddit',
    sourceUrl: 'https://reddit.com/r/MachineLearning',
    sourceName: 'r/MachineLearning',
    priority: 5,
  },
  {
    sourceType: 'reddit',
    sourceUrl: 'https://reddit.com/r/startups',
    sourceName: 'r/startups',
    priority: 3,
  },
];
