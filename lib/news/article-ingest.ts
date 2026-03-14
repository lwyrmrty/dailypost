import { categorizeTopic } from './aggregator';
import { extractKeyPoints, generateSummary, scrapeArticle } from './scraper';
import { canScrapeLinkedInUrl, isLinkedInUrl } from './linkedin-scraper';

export type ArticleSourceType =
  | 'article'
  | 'linkedinArticle'
  | 'linkedinNewsletter'
  | 'linkedinPost'
  | 'unsupported';

export interface ArticleContext {
  title: string;
  summary: string;
  keyPoints: string[];
  content: string;
  author?: string;
  publishedDate?: string;
  url: string;
  sourceType: Exclude<ArticleSourceType, 'unsupported'>;
  topic?: string;
}

type IngestSuccess = {
  ok: true;
  article: ArticleContext;
};

type IngestFailure = {
  ok: false;
  sourceType: ArticleSourceType;
  reason: string;
};

export type IngestArticleResult = IngestSuccess | IngestFailure;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!match) {
    return null;
  }

  return normalizeUrl(match[0]);
}

export function normalizeUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/[),.;!?]+$/, '');
}

export function classifyArticleUrl(url: string): ArticleSourceType {
  if (!isLinkedInUrl(url)) {
    return 'article';
  }

  if (/linkedin\.com\/pulse\//i.test(url)) {
    return 'linkedinArticle';
  }

  if (/linkedin\.com\/newsletters\//i.test(url)) {
    return 'linkedinNewsletter';
  }

  if (/linkedin\.com\/posts\//i.test(url) || /linkedin\.com\/feed\/update\//i.test(url) || /activity-\d+/i.test(url)) {
    return 'linkedinPost';
  }

  return 'unsupported';
}

export async function ingestArticleUrl(rawUrl: string): Promise<IngestArticleResult> {
  const url = normalizeUrl(rawUrl);
  const sourceType = classifyArticleUrl(url);

  if (sourceType === 'unsupported') {
    if (isLinkedInUrl(url)) {
      const validation = canScrapeLinkedInUrl(url);
      return {
        ok: false,
        sourceType,
        reason: validation.reason || 'This LinkedIn URL is not supported for article ingestion.',
      };
    }

    return {
      ok: false,
      sourceType,
      reason: 'This URL type is not supported for article ingestion.',
    };
  }

  if (sourceType === 'linkedinArticle' || sourceType === 'linkedinNewsletter') {
    const validation = canScrapeLinkedInUrl(url);
    if (!validation.valid) {
      return {
        ok: false,
        sourceType,
        reason: validation.reason || 'This LinkedIn URL could not be read publicly.',
      };
    }
  }

  const scraped = await scrapeArticle(url);
  if (!scraped || !scraped.title || !scraped.content) {
    return {
      ok: false,
      sourceType,
      reason: sourceType === 'linkedinPost'
        ? 'This LinkedIn post could not be read publicly. Try pasting the post text instead.'
        : 'I could not extract enough content from that URL.',
    };
  }

  const summary = scraped.summary?.trim() || generateSummary(scraped.content);
  const keyPoints = extractKeyPoints(scraped.content, 5);
  const content = scraped.content.trim();

  if (content.length < 120 && summary.length < 80) {
    return {
      ok: false,
      sourceType,
      reason: sourceType === 'linkedinPost'
        ? 'This LinkedIn post did not expose enough public text to work from. Paste the post text instead.'
        : 'The page did not expose enough readable text to generate posts from.',
    };
  }

  return {
    ok: true,
    article: {
      title: scraped.title.trim(),
      summary,
      keyPoints,
      content,
      author: scraped.author,
      publishedDate: scraped.publishedDate,
      url,
      sourceType,
      topic: categorizeTopic(`${scraped.title} ${scraped.content}`),
    },
  };
}
