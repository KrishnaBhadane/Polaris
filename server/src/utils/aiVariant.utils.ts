import crypto from 'crypto';

export const MAX_AI_VARIANTS = 5;

/**
 * Computes a normalized SHA-256 fingerprint for a response string.
 * Strips markdown markup, whitespace, and punctuation, and normalizes casing
 * so formatting-only changes do not register as distinct variants.
 */
export function computeNormalizedFingerprint(text: string): string {
  if (!text) return '';
  const normalized = text
    .toLowerCase()
    .replace(/[#*_\-\[\]()>:`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Determines whether a candidate response is effectively duplicate
 * to any existing variant. Checks both exact SHA-256 hash match and
 * high lexical/token overlap (> 90%).
 */
export function isDuplicateVariant(
  candidateText: string,
  existingVariants: Array<{ fingerprint?: string; result: string }>
): boolean {
  if (!candidateText || !existingVariants || existingVariants.length === 0) {
    return false;
  }

  const candidateFingerprint = computeNormalizedFingerprint(candidateText);

  // 1. Check exact fingerprint match
  for (const v of existingVariants) {
    const vFp = v.fingerprint || computeNormalizedFingerprint(v.result);
    if (vFp === candidateFingerprint) {
      return true;
    }
  }

  // 2. Check token-based similarity (Jaccard coefficient on significant words)
  const tokenize = (s: string) => {
    return new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\u0900-\u097F\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  };

  const candidateTokens = tokenize(candidateText);
  if (candidateTokens.size === 0) return false;

  for (const v of existingVariants) {
    const vTokens = tokenize(v.result);
    if (vTokens.size === 0) continue;

    let intersectionCount = 0;
    for (const t of candidateTokens) {
      if (vTokens.has(t)) {
        intersectionCount++;
      }
    }

    const unionCount = candidateTokens.size + vTokens.size - intersectionCount;
    if (unionCount > 0) {
      const similarity = intersectionCount / unionCount;
      if (similarity >= 0.92) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Sanitizes any raw AI provider errors before they can reach the user/client.
 * Strictly guarantees that Gemini, Google, model IDs, or internal errors
 * are never exposed.
 */
export function sanitizeAIErrorMessage(
  error: any,
  fallbackMessage: string = 'Polar Jarvis hit a small snag. Try again.'
): string {
  if (!error) return fallbackMessage;

  const rawMsg = String(error?.message || error || '').toLowerCase();
  const status = error?.status || error?.statusCode;

  // Rate limit / Quota
  if (
    status === 429 ||
    status === 503 ||
    rawMsg.includes('resource_exhausted') ||
    rawMsg.includes('quota') ||
    rawMsg.includes('429') ||
    rawMsg.includes('unavailable')
  ) {
    return 'Polar Jarvis is currently experiencing high demand. Please try again in a moment.';
  }

  // Model not found or discontinued
  if (rawMsg.includes('not found') || rawMsg.includes('404') || rawMsg.includes('no longer available')) {
    return 'Generation is temporarily unavailable. Please try again.';
  }

  // Detect and purge any leaks of provider / model details
  const leakKeywords = [
    'gemini',
    'google',
    'models/',
    'api_key',
    'apikey',
    'genai',
    'generativelanguage',
    'prompt',
    'bearer',
    'undefined',
    'null',
    'object object',
  ];

  for (const kw of leakKeywords) {
    if (rawMsg.includes(kw)) {
      return fallbackMessage;
    }
  }

  // If the error message was already a clean user-facing sentence without leaks, allow it
  if (
    error.message &&
    typeof error.message === 'string' &&
    error.message.length < 120 &&
    !error.message.includes('Error:') &&
    !error.message.includes('at ')
  ) {
    return error.message;
  }

  return fallbackMessage;
}
