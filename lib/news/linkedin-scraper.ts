import { parseFeed, filterRecentItems, RSSItem } from './rss-parser';
import { NewsStory, categorizeTopic } from './aggregator';
import { scrapeArticle } from './scraper';

/**
 * LinkedIn content scraper
 * 
 * LinkedIn has limited public access:
 * - Newsletters have RSS feeds: linkedin.com/newsletters/[name]-[id]
 * - Pulse articles can be scraped directly
 * - Regular posts require auth (not supported)
 * 
 * URL patterns:
 * - Newsletter: https://www.linkedin.com/newsletters/[name]-[id]
 * - Article: https://www.linkedin.com/pulse/[slug]
 * - Company page: https://www.linkedin.com/company/[name] (limited)
 */

/**
 * Check if a URL is a LinkedIn URL
 */
export function isLinkedInUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com/.test(url);
}

/**
 * Detect LinkedIn URL type
 */
export function getLinkedInUrlType(url: string): 'newsletter' | 'article' | 'company' | 'profile' | 'unknown' {
  if (/linkedin\.com\/newsletters\//.test(url)) {
    return 'newsletter';
  }
  if (/linkedin\.com\/pulse\//.test(url)) {
    return 'article';
  }
  if (/linkedin\.com\/company\//.test(url)) {
    return 'company';
  }
  if (/linkedin\.com\/in\//.test(url)) {
    return 'profile';
  }
  return 'unknown';
}

/**
 * Convert LinkedIn newsletter URL to RSS
 */
export function toLinkedInNewsletterRss(url: string): string | null {
  // LinkedIn newsletters have RSS at the same URL with /feed appended
  const match = url.match(/linkedin\.com\/newsletters\/([^\/\?]+)/);
  if (match) {
    return `https://www.linkedin.com/newsletters/${match[1]}/feed`;
  }
  return null;
}

/**
 * Fetch stories from a LinkedIn newsletter RSS feed
 */
async function fetchNewsletterStories(
  sourceUrl: string,
  sourceName: string | null,
  priority: number
): Promise<NewsStory[]> {
  const stories: NewsStory[] = [];
  
  const rssUrl = toLinkedInNewsletterRss(sourceUrl);
  if (!rssUrl) {
    console.error(`Could not convert LinkedIn newsletter URL to RSS: ${sourceUrl}`);
    return stories;
  }
  
  try {
    const parsed = await parseFeed(rssUrl);
    
    if (!parsed) {
      console.error(`Failed to parse LinkedIn newsletter feed: ${rssUrl}`);
      return stories;
    }
    
    const recentItems = filterRecentItems(parsed.items, 168); // 1 week for newsletters
    
    const displayName = sourceName || parsed.title || 'LinkedIn Newsletter';
    
    recentItems.slice(0, 10).forEach((item: RSSItem) => {
      stories.push({
        title: item.title,
        summary: extractLinkedInContent(item.contentSnippet || item.content || ''),
        url: item.link,
        publishedAt: new Date(item.pubDate),
        source: displayName,
        topic: categorizeTopic(item.title + ' ' + item.contentSnippet),
        priority,
      });
    });
  } catch (error) {
    console.error(`Failed to fetch LinkedIn newsletter: ${sourceUrl}`, error);
  }
  
  return stories;
}

/**
 * Fetch a single LinkedIn article by scraping
 */
async function fetchArticleStory(
  articleUrl: string,
  sourceName: string | null,
  priority: number
): Promise<NewsStory | null> {
  try {
    const scraped = await scrapeArticle(articleUrl);
    
    if (!scraped || !scraped.title) {
      console.error(`Failed to scrape LinkedIn article: ${articleUrl}`);
      return null;
    }
    
    return {
      title: scraped.title,
      summary: scraped.summary || scraped.content?.slice(0, 500) || '',
      url: articleUrl,
      publishedAt: scraped.publishedDate ? new Date(scraped.publishedDate) : new Date(),
      source: sourceName || scraped.author || 'LinkedIn',
      topic: categorizeTopic(scraped.title + ' ' + scraped.content),
      priority,
    };
  } catch (error) {
    console.error(`Failed to fetch LinkedIn article: ${articleUrl}`, error);
    return null;
  }
}

/**
 * Fetch stories from a LinkedIn source
 */
export async function fetchLinkedInStories(
  sourceUrl: string,
  sourceName: string | null,
  priority: number
): Promise<NewsStory[]> {
  const urlType = getLinkedInUrlType(sourceUrl);
  
  switch (urlType) {
    case 'newsletter':
      return fetchNewsletterStories(sourceUrl, sourceName, priority);
      
    case 'article': {
      const story = await fetchArticleStory(sourceUrl, sourceName, priority);
      return story ? [story] : [];
    }
    
    case 'company':
    case 'profile':
      // These require authentication, not supported
      console.warn(`LinkedIn ${urlType} URLs require authentication and are not supported: ${sourceUrl}`);
      return [];
      
    default:
      console.warn(`Unknown LinkedIn URL type: ${sourceUrl}`);
      return [];
  }
}

/**
 * Extract readable content from LinkedIn HTML
 */
function extractLinkedInContent(htmlContent: string): string {
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
 * Suggested LinkedIn sources for tech/startup content
 */
export const LINKEDIN_DEFAULT_SOURCES = [
  // These would be newsletter URLs that users can add
  // Example format: https://www.linkedin.com/newsletters/ai-weekly-1234567890
];

/**
 * Validate if a LinkedIn URL can be scraped
 */
export function canScrapeLinkedInUrl(url: string): { valid: boolean; reason?: string } {
  const urlType = getLinkedInUrlType(url);
  
  switch (urlType) {
    case 'newsletter':
      return { valid: true };
    case 'article':
      return { valid: true };
    case 'company':
      return { valid: false, reason: 'Company pages require LinkedIn authentication' };
    case 'profile':
      return { valid: false, reason: 'Profile pages require LinkedIn authentication' };
    default:
      return { valid: false, reason: 'URL type not recognized' };
  }
}
