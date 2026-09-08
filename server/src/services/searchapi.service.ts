import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface ScientificWebResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  date?: string;
}

export interface SearchApiResult {
  success: boolean;
  results: ScientificWebResult[];
  error?: string;
}

/**
 * Validates that a URL uses http: or https: scheme only.
 * Rejects javascript:, data:, file:, etc.
 */
function isValidScientificUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Strips HTML tags and excessive whitespace from snippets or titles.
 */
function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scores and ranks candidate search results to prioritize credible scientific sources.
 */
function scoreScientificResult(url: string, title: string, snippet: string): number {
  let score = 0;
  const lowerUrl = url.toLowerCase();
  const lowerText = `${title} ${snippet}`.toLowerCase();

  // Tier 1: NCPOR & MoES (India's official polar research organizations)
  if (lowerUrl.includes('ncpor.res.in') || lowerUrl.includes('moes.gov.in')) {
    score += 100;
  }

  // Tier 2: Top polar & ocean research agencies and peer-reviewed journals
  const topScientificDomains = [
    'nasa.gov',
    'noaa.gov',
    'esa.int',
    'nature.com',
    'science.org',
    'sciencemag.org',
    'doi.org',
    'copernicus.org',
    'agu.org',
    'sciencedirect.com',
    'springer.com',
    'wiley.com',
    'bas.ac.uk',
    'scar.org',
    'npolar.no',
    'whoi.edu',
    'scripps.ucsd.edu',
    'oceanographic',
    'antarctica.gov.au',
  ];

  if (topScientificDomains.some((d) => lowerUrl.includes(d))) {
    score += 50;
  }

  // Tier 3: Institutional, government, university, academic domains
  if (
    lowerUrl.includes('.gov') ||
    lowerUrl.includes('.gov.in') ||
    lowerUrl.includes('.edu') ||
    lowerUrl.includes('.ac.in') ||
    lowerUrl.includes('.ac.uk') ||
    lowerUrl.includes('.org')
  ) {
    score += 25;
  }

  // Polar and ocean scientific keywords
  const polarTerms = [
    'ncpor',
    'antarctic',
    'antarctica',
    'arctic',
    'polar',
    'ocean',
    'cryosphere',
    'glacier',
    'ice sheet',
    'sea ice',
    'permafrost',
    'salinity',
    'maitri',
    'bharati',
    'himadri',
  ];

  for (const term of polarTerms) {
    if (lowerText.includes(term)) {
      score += 5;
    }
  }

  // Penalize spam / non-scientific / social media / shopping domains
  const blockedPatterns = [
    'quora.com',
    'reddit.com',
    'pinterest.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'tiktok.com',
    'youtube.com',
    'amazon.',
    'ebay.',
    'flipkart.',
    'walmart.',
  ];

  for (const b of blockedPatterns) {
    if (lowerUrl.includes(b)) {
      score -= 100;
      break;
    }
  }

  return score;
}

/**
 * Searches the live scientific web using SearchAPI.io Google engine.
 * - Authenticates via Authorization: Bearer <API_KEY> header
 * - 8-second timeout via AbortSignal.timeout
 * - Filters untrusted URLs and extracts up to 5 top scientific results
 * - Never logs or exposes the API key
 */
export async function searchScientificWeb(query: string): Promise<SearchApiResult> {
  const apiKey = config.searchApiKey || process.env.SEARCHAPI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    logger.warn('[Maya Search] SEARCHAPI_API_KEY is not configured.');
    return {
      success: false,
      results: [],
      error: 'SearchAPI key is missing.',
    };
  }

  // Sanitize query
  const sanitizedQuery = query.trim().slice(0, 250);
  if (!sanitizedQuery) {
    return { success: false, results: [] };
  }

  const startTime = Date.now();
  logger.info(`[Maya Search] live search triggered for query: "${sanitizedQuery}"`);

  try {
    const params = new URLSearchParams({
      engine: 'google',
      q: sanitizedQuery,
    });

    const url = `https://www.searchapi.io/api/v1/search?${params.toString()}`;

    // 8-second timeout
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      logger.warn(
        `[Maya Search] request failed with HTTP ${response.status} in ${duration}ms`
      );
      return {
        success: false,
        results: [],
        error: `SearchAPI HTTP ${response.status}`,
      };
    }

    const data: any = await response.json();
    const rawResults: any[] = Array.isArray(data?.organic_results)
      ? data.organic_results
      : [];

    const candidates: Array<{
      item: ScientificWebResult;
      score: number;
    }> = [];

    for (const r of rawResults) {
      const link = typeof r.link === 'string' ? r.link.trim() : '';
      if (!link || !isValidScientificUrl(link)) continue;

      const title = sanitizeText(r.title || '');
      const snippet = sanitizeText(r.snippet || '');
      if (!title && !snippet) continue;

      const score = scoreScientificResult(link, title, snippet);

      // Extract source name (e.g. "NCPOR", "Nature", or hostname)
      let sourceName = r.source || r.displayed_link || '';
      if (!sourceName) {
        try {
          sourceName = new URL(link).hostname.replace(/^www\./, '');
        } catch {
          sourceName = 'Web';
        }
      }

      candidates.push({
        item: {
          title: title || sourceName,
          url: link,
          snippet: snippet.slice(0, 320),
          source: sourceName,
          date: r.date ? String(r.date).trim() : undefined,
        },
        score,
      });
    }

    // Sort by scientific relevance score descending
    candidates.sort((a, b) => b.score - a.score);

    // Limit to top 5 organic scientific results maximum
    const topResults = candidates.slice(0, 5).map((c) => c.item);

    logger.info(
      `[Maya Search] results: ${topResults.length} in ${duration}ms`
    );

    return {
      success: true,
      results: topResults,
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    logger.warn(
      `[Maya Search] request error in ${duration}ms: ${
        isTimeout ? 'Timeout (8s exceeded)' : err?.message || 'Network error'
      }`
    );

    return {
      success: false,
      results: [],
      error: isTimeout ? 'Search request timed out.' : 'Search service unavailable.',
    };
  }
}
