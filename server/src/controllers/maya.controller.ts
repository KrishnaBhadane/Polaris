import { Request, Response } from 'express';
import {
  generateMayaReply,
  needsGrounding,
  searchPolarisContext,
  isOutOfScope,
  needsLiveSearch,
  buildWebSearchQuery,
  buildWebContext,
} from '../services/maya.service';
import type { MayaLanguage, MayaRecentMessage, MayaGroundingRecord } from '../services/maya.service';
import { searchScientificWeb } from '../services/searchapi.service';
import { streamElevenlabsSpeech } from '../services/elevenlabsTts.service';
import { logger } from '../utils/logger';

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window rate limiter strictly for Maya: 30 requests / hour / user
const mayaUserRateLimits = new Map<string, RateLimitRecord>();
const MAYA_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAYA_MAX_REQUESTS = 30; // 30 messages per user per hour

export const checkMayaRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const windowStart = now - MAYA_WINDOW_MS;
  const record = mayaUserRateLimits.get(userId) || { timestamps: [] };

  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= MAYA_MAX_REQUESTS) {
    return false;
  }

  activeTimestamps.push(now);
  mayaUserRateLimits.set(userId, { timestamps: activeTimestamps });
  return true;
};

// Helper for resetting in test environments
export const _resetMayaRateLimits = (): void => {
  mayaUserRateLimits.clear();
  ttsUserRateLimits.clear();
};

// In-memory sliding window rate limiter strictly for Maya TTS: 30 requests / hour / user
const ttsUserRateLimits = new Map<string, RateLimitRecord>();
const TTS_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TTS_MAX_REQUESTS = 30; // 30 TTS calls per user per hour

export const checkTtsRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const windowStart = now - TTS_WINDOW_MS;
  const record = ttsUserRateLimits.get(userId) || { timestamps: [] };

  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= TTS_MAX_REQUESTS) {
    return false;
  }

  activeTimestamps.push(now);
  ttsUserRateLimits.set(userId, { timestamps: activeTimestamps });
  return true;
};

export const chatWithMayaHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    const userId = user._id.toString();

    // 1. Rate limiting check (30 messages per authenticated user per hour)
    const isAllowed = checkMayaRateLimit(userId);
    if (!isAllowed) {
      res.status(429).json({
        success: false,
        message: 'Maya has handled quite a few questions for now. Please try again later.',
      });
      return;
    }

    // 2. Body validation
    const { message, language, recentMessages } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'A non-empty message string is required.',
      });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 2000) {
      res.status(400).json({
        success: false,
        message: 'Message cannot exceed 2000 characters.',
      });
      return;
    }

    if (language && language !== 'EN' && language !== 'HI') {
      res.status(400).json({
        success: false,
        message: 'Language must be either EN or HI.',
      });
      return;
    }
    const selectedLanguage: MayaLanguage = language === 'HI' ? 'HI' : 'EN';

    // 3. Sanitize recent messages context (max 8)
    let sanitizedRecent: MayaRecentMessage[] = [];
    if (Array.isArray(recentMessages)) {
      sanitizedRecent = recentMessages
        .slice(-8)
        .filter(
          (m: any) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0 &&
            m.content.length <= 2000
        )
        .map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content.trim(),
        }));
    }

    // 4. Decision Flow: Out-of-scope -> Live Web Search -> POLARIS Grounding -> Model Knowledge
    let polarisContext: string | null = null;
    let webContext: string | null = null;
    let sources: MayaGroundingRecord[] = [];

    // If message is clearly outside scientific scope, do not query web or DB
    if (!isOutOfScope(trimmedMessage)) {
      if (needsLiveSearch(trimmedMessage)) {
        const searchQuery = buildWebSearchQuery(trimmedMessage);
        const searchResult = await searchScientificWeb(searchQuery);

        if (searchResult.success && searchResult.results.length > 0) {
          webContext = buildWebContext(searchResult.results);
          sources = searchResult.results.map((r) => ({
            title: r.title,
            url: r.url,
            sourceType: 'WEB' as const,
            sourceName: r.source || 'Web',
          }));
        } else {
          // Graceful fallback for timeouts, 401, 429, or zero useful results
          logger.warn(`[Maya Search] Web search unavailable or empty: ${searchResult.error || '0 results'}`);
          const fallbackReply =
            selectedLanguage === 'HI'
              ? 'मैं अभी लाइव वैज्ञानिक स्रोतों की जांच नहीं कर पाया। मैं अभी भी उपलब्ध POLARIS जानकारी और वैज्ञानिक ज्ञान का उपयोग करके मदद कर सकता हूँ।'
              : "I couldn't check live scientific sources right now. I can still help using available POLARIS information and scientific knowledge.";
          res.status(200).json({
            success: true,
            reply: fallbackReply,
            sources: [],
          });
          return;
        }
      } else if (needsGrounding(trimmedMessage)) {
        const groundingResult = await searchPolarisContext(trimmedMessage);
        polarisContext = groundingResult.contextBlock;
        sources = groundingResult.sources.map((s) => ({
          ...s,
          sourceType: 'POLARIS' as const,
          url: s.externalUrl || (s.id ? `/repository/${s.id}` : undefined),
        }));
      }
    }

    // 5. Generate Maya response
    const reply = await generateMayaReply(
      trimmedMessage,
      selectedLanguage,
      sanitizedRecent,
      polarisContext,
      webContext
    );

    res.status(200).json({
      success: true,
      reply,
      sources,
    });
  } catch (error: any) {
    logger.error(`[Maya Controller Error] ${error?.message || error}`);
    // Never expose raw backend/provider errors, model name, stack trace, or API keys
    res.status(500).json({
      success: false,
      message: 'Maya hit a small snag. Try again.',
    });
  }
};

export const generateMayaTtsHandler = async (req: Request, res: Response): Promise<void> => {
  const abortController = new AbortController();

  // If client disconnects or aborts request early, cancel upstream ElevenLabs stream
  req.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    const userId = user._id.toString();

    // 1. Rate limiting check (30 TTS requests per user per hour)
    const isAllowed = checkTtsRateLimit(userId);
    if (!isAllowed) {
      res.status(429).json({
        success: false,
        message: 'Maya has spoken quite a bit for now. Please try again later.',
      });
      return;
    }

    // 2. Body validation
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'A non-empty text string is required for speech synthesis.',
      });
      return;
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 3000) {
      res.status(400).json({
        success: false,
        message: 'Text cannot exceed 3000 characters.',
      });
      return;
    }

    // 3. Initiate streaming speech from ElevenLabs
    const result = await streamElevenlabsSpeech(trimmedText, abortController.signal);

    // 4. Set chunked streaming headers
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // 5. Pipe/stream chunks immediately to Express response
    const reader = result.stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (res.writableEnded || res.destroyed) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error: any) {
    if (abortController.signal.aborted) {
      // Client aborted / closed connection; clean exit
      return;
    }
    logger.error(`[Maya TTS Controller Error] ${error?.message || error}`);
    // Never expose provider details, keys, or stack traces
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Maya couldn't speak that reply. You can still read it.",
      });
    } else {
      res.end();
    }
  }
};
