import * as cheerio from 'cheerio';

interface ScrapedContent {
  title: string;
  content: string;
  author?: string;
  publishedDate?: string;
  summary?: string;
}

export async function scrapeArticle(url: string): Promise<ScrapedContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyPost/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style, nav, footer, header, aside, .advertisement, .ad, .sidebar').remove();

    // Extract title
    const title = $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim();

    // Extract main content
    const articleSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
    ];

    let content = '';
    for (const selector of articleSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        break;
      }
    }

    // Fallback to body if no article found
    if (!content) {
      content = $('body').text().trim();
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .slice(0, 5000); // Limit content length

    // Extract author
    const author = $('meta[name="author"]').attr('content') ||
      $('[rel="author"]').first().text().trim() ||
      $('.author').first().text().trim();

    // Extract published date
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
      $('time[datetime]').first().attr('datetime') ||
      $('meta[name="date"]').attr('content');

    // Extract summary/description
    const summary = $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content');

    return {
      title,
      content,
      author: author || undefined,
      publishedDate: publishedDate || undefined,
      summary: summary || undefined,
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return null;
  }
}

export function extractKeyPoints(content: string, maxPoints: number = 5): string[] {
  // Split into sentences
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300);

  // Score sentences by importance (simple heuristic)
  const scored = sentences.map(sentence => {
    let score = 0;
    
    // Contains numbers (often important data)
    if (/\d+/.test(sentence)) score += 2;
    
    // Contains quotes
    if (/".*"/.test(sentence)) score += 1;
    
    // Contains key phrases
    const keyPhrases = ['announced', 'launched', 'raised', 'revealed', 'discovered', 'developed', 'according to'];
    if (keyPhrases.some(phrase => sentence.toLowerCase().includes(phrase))) {
      score += 2;
    }
    
    // Reasonable length bonus
    if (sentence.length > 50 && sentence.length < 150) score += 1;
    
    return { sentence, score };
  });

  // Sort by score and take top points
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPoints)
    .map(s => s.sentence);
}

export function generateSummary(content: string, maxLength: number = 300): string {
  // Get first few sentences that make sense as a summary
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  let summary = '';
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) break;
    summary += sentence + '. ';
  }

  return summary.trim();
}






