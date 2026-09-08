import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Content } from '../models/content.model';
import { AICache } from '../models/aiCache.model';
import { ContentStatus } from '../types/content.types';
import { AccountStatus, UserRole } from '../types/user.types';
import {
  generateContentSummary,
  generateContentOutreach,
  generateWorkspaceSummary as generateWorkspaceSummaryService,
  SummaryMode,
  OutreachFormat,
  AILanguage,
} from '../services/gemini.service';
import { validateAndFetchPublicUrl } from '../utils/ssrf';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  MAX_AI_VARIANTS,
  computeNormalizedFingerprint,
  isDuplicateVariant,
  sanitizeAIErrorMessage,
} from '../utils/aiVariant.utils';

/** Logs timing only in development mode. */
function devLog(label: string, startMs: number): void {
  if (config.nodeEnv === 'development') {
    logger.info(`[AI Timing] ${label}: ${Date.now() - startMs}ms`);
  }
}

/**
 * Validate and parse AI language (EN or HI, default EN)
 */
function parseLanguage(rawLang: any): AILanguage {
  if (!rawLang) return 'EN';
  const upper = String(rawLang).trim().toUpperCase();
  if (upper === 'HI' || upper === 'HINDI') {
    return 'HI';
  }
  return 'EN';
}

/**
 * Ensures backwards compatibility for legacy cache documents that had a single `result` string
 * by initializing the `variants` array with that single result as Variant 1.
 */
function ensureVariantsArray(cachedEntry: any): void {
  if (!cachedEntry.variants || cachedEntry.variants.length === 0) {
    if (cachedEntry.result) {
      cachedEntry.variants = [
        {
          result: cachedEntry.result,
          source: cachedEntry.source || 'METADATA',
          fingerprint: computeNormalizedFingerprint(cachedEntry.result),
          generatedAt: cachedEntry.generatedAt || new Date(),
        },
      ];
      cachedEntry.currentVariantIndex = 0;
    } else {
      cachedEntry.variants = [];
      cachedEntry.currentVariantIndex = 0;
    }
  }
}

// Track in-flight prefetch promises to prevent duplicate background generation
const inFlightPrefetches = new Set<string>();

function getPrefetchKey(
  contentId: string,
  type: 'SUMMARY' | 'OUTREACH',
  modeOrFormat: string,
  language: string
): string {
  return `${contentId}_${type}_${modeOrFormat}_${language}`;
}

/**
 * Asynchronously prepares ONE next variant ahead in the background.
 * Strictly one-ahead only: generates 1 variant and stops.
 */
function scheduleNextVariantPrefetch(
  contentId: string,
  type: 'SUMMARY' | 'OUTREACH',
  modeOrFormat: string,
  language: AILanguage
): void {
  const key = getPrefetchKey(contentId, type, modeOrFormat, language);
  if (inFlightPrefetches.has(key)) {
    return;
  }
  inFlightPrefetches.add(key);

  setImmediate(async () => {
    try {
      const content = await Content.findById(contentId);
      if (!content || content.status !== ContentStatus.PUBLISHED) return;

      const cached = await AICache.findOne({
        contentId: content._id,
        type,
        modeOrFormat,
        language,
      });
      if (!cached) return;

      // Invalidation check: content was updated
      if (
        cached.contentUpdatedAt &&
        cached.contentUpdatedAt.getTime() !== content.updatedAt.getTime()
      ) {
        return;
      }

      ensureVariantsArray(cached);

      // Max 5 variants limit
      if (cached.variants.length >= MAX_AI_VARIANTS) {
        return;
      }

      const nextVariantNum = cached.variants.length + 1;
      logger.info(
        `[OneAhead] Prefetching ${type} variant ${nextVariantNum}/${MAX_AI_VARIANTS} [${modeOrFormat}/${language}] for content ${contentId}...`
      );

      let newResult = '';
      let newSource = '';

      if (type === 'SUMMARY') {
        const gen = await generateContentSummary(
          content,
          modeOrFormat as SummaryMode,
          language,
          nextVariantNum
        );
        newResult = gen.summary;
        newSource = gen.source;

        if (isDuplicateVariant(newResult, cached.variants)) {
          logger.warn(`[OneAhead] Prefetched summary variant ${nextVariantNum} was duplicate. Retrying once...`);
          const retryGen = await generateContentSummary(
            content,
            modeOrFormat as SummaryMode,
            language,
            nextVariantNum
          );
          newResult = retryGen.summary;
          newSource = retryGen.source;
        }
      } else {
        const gen = await generateContentOutreach(
          content,
          modeOrFormat as OutreachFormat,
          language,
          nextVariantNum
        );
        newResult = gen.draft;
        newSource = gen.source;

        if (isDuplicateVariant(newResult, cached.variants)) {
          logger.warn(`[OneAhead] Prefetched outreach variant ${nextVariantNum} was duplicate. Retrying once...`);
          const retryGen = await generateContentOutreach(
            content,
            modeOrFormat as OutreachFormat,
            language,
            nextVariantNum
          );
          newResult = retryGen.draft;
          newSource = retryGen.source;
        }
      }

      // Append pre-generated variant
      cached.variants.push({
        result: newResult,
        source: newSource,
        fingerprint: computeNormalizedFingerprint(newResult),
        generatedAt: new Date(),
      });

      await cached.save();
      logger.info(
        `[OneAhead] Successfully cached ${type} variant ${nextVariantNum} [${modeOrFormat}/${language}] for content ${contentId}.`
      );
    } catch (err: any) {
      logger.warn(`[OneAhead] Prefetch failed for ${key}: ${err?.message}`);
    } finally {
      inFlightPrefetches.delete(key);
    }
  });
}

/**
 * Generate AI Summary (QUICK, STUDENT, TECHNICAL) in English or Hindi
 * Accessible to authenticated, verified, active USER, SCIENTIST, ADMIN.
 * Results are cached in MongoDB per contentId, mode, language, and content.updatedAt.
 */
export const generateSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (user && !user.emailVerified) {
      res.status(403).json({
        success: false,
        message: 'Your email address must be verified to use AI summaries.',
      });
      return;
    }

    if (user && user.accountStatus !== AccountStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact support.',
      });
      return;
    }

    const { contentId } = req.params;
    if (
      !contentId ||
      typeof contentId !== 'string' ||
      !mongoose.Types.ObjectId.isValid(contentId)
    ) {
      res.status(404).json({
        success: false,
        message: 'Scientific content not found.',
      });
      return;
    }

    // 1. Fetch content document
    const content = await Content.findById(contentId);
    if (!content) {
      res.status(404).json({
        success: false,
        message: 'Scientific content not found.',
      });
      return;
    }

    // 2. Only PUBLISHED content can be summarized
    if (content.status !== ContentStatus.PUBLISHED) {
      res.status(400).json({
        success: false,
        message: 'Only published scientific content can be summarized.',
      });
      return;
    }

    // 3. Validate summary mode (default: QUICK)
    const rawMode = req.body?.mode;
    let mode = SummaryMode.QUICK;

    if (rawMode) {
      const upperMode = String(rawMode).trim().toUpperCase();
      if (Object.values(SummaryMode).includes(upperMode as SummaryMode)) {
        mode = upperMode as SummaryMode;
      } else {
        res.status(400).json({
          success: false,
          message: `Invalid summary mode. Allowed modes are: ${Object.values(SummaryMode).join(', ')}`,
        });
        return;
      }
    }

    // 4. Validate language (default: EN)
    const rawLang = req.body?.language;
    if (rawLang) {
      const upperLang = String(rawLang).trim().toUpperCase();
      if (upperLang !== 'EN' && upperLang !== 'HI') {
        res.status(400).json({
          success: false,
          message: 'Invalid language. Allowed languages are: EN, HI',
        });
        return;
      }
    }
    const language = parseLanguage(rawLang);
    const isRegenerate = Boolean(req.body?.regenerate);

    // 5. Check MongoDB AI Cache
    let cachedEntry = await AICache.findOne({
      contentId: content._id,
      type: 'SUMMARY',
      modeOrFormat: mode,
      language,
    });

    // Content update invalidation check: if content changed, delete stale cache and start fresh
    if (
      cachedEntry &&
      cachedEntry.contentUpdatedAt &&
      cachedEntry.contentUpdatedAt.getTime() !== content.updatedAt.getTime()
    ) {
      logger.info(
        `[AICache] Content ${contentId} updatedAt changed. Invalidating old summary cache [${mode}/${language}].`
      );
      await AICache.deleteOne({ _id: cachedEntry._id });
      cachedEntry = null;
    }

    if (cachedEntry) {
      ensureVariantsArray(cachedEntry);

      if (isRegenerate) {
        const currentIdx = cachedEntry.currentVariantIndex ?? 0;
        const targetNextIdx = (currentIdx + 1) % MAX_AI_VARIANTS;

        if (targetNextIdx < cachedEntry.variants.length) {
          // Next variant already exists in cache! Return immediately from MongoDB (zero AI calls)
          cachedEntry.currentVariantIndex = targetNextIdx;
          cachedEntry.result = cachedEntry.variants[targetNextIdx].result;
          cachedEntry.source = cachedEntry.variants[targetNextIdx].source;
          await cachedEntry.save();

          // Prefetch following variant asynchronously if total cached < 5
          if (cachedEntry.variants.length < MAX_AI_VARIANTS) {
            scheduleNextVariantPrefetch(content._id.toString(), 'SUMMARY', mode, language);
          }

          devLog(`generateSummary REGENERATE CACHE HIT [${mode}/${language}](v${targetNextIdx + 1})`, Date.now());
          res.status(200).json({
            success: true,
            mode,
            language,
            source: cachedEntry.variants[targetNextIdx].source,
            summary: cachedEntry.variants[targetNextIdx].result,
            cached: true,
          });
          return;
        }

        // Next variant does not exist yet and variants < 5: generate exactly ONE new variant
        const nextVariantNum = cachedEntry.variants.length + 1;
        const t0 = Date.now();
        let { summary, source } = await generateContentSummary(content, mode, language, nextVariantNum);

        // Duplicate check with at most 1 retry
        if (isDuplicateVariant(summary, cachedEntry.variants)) {
          logger.warn(`Generated summary variant ${nextVariantNum} was duplicate. Retrying once...`);
          const retry = await generateContentSummary(content, mode, language, nextVariantNum);
          summary = retry.summary;
          source = retry.source;
        }

        const newVariant = {
          result: summary,
          source,
          fingerprint: computeNormalizedFingerprint(summary),
          generatedAt: new Date(),
        };
        cachedEntry.variants.push(newVariant);
        cachedEntry.currentVariantIndex = cachedEntry.variants.length - 1;
        cachedEntry.result = summary;
        cachedEntry.source = source;
        await cachedEntry.save();
        devLog(`generateSummary REGENERATE AI generation [${mode}/${language}](v${nextVariantNum})`, t0);

        // Prefetch following variant if total cached < 5
        if (cachedEntry.variants.length < MAX_AI_VARIANTS) {
          scheduleNextVariantPrefetch(content._id.toString(), 'SUMMARY', mode, language);
        }

        res.status(200).json({
          success: true,
          mode,
          language,
          source,
          summary,
          cached: false,
        });
        return;
      }

      // Non-regenerate request with existing cache: return active variant
      const currentIdx = cachedEntry.currentVariantIndex ?? 0;
      const safeIdx = currentIdx < cachedEntry.variants.length ? currentIdx : 0;
      const activeVariant = cachedEntry.variants[safeIdx];

      // If only V1 exists (or < 5), ensure next variant is asynchronously prefetched
      if (cachedEntry.variants.length < MAX_AI_VARIANTS) {
        scheduleNextVariantPrefetch(content._id.toString(), 'SUMMARY', mode, language);
      }

      devLog(`generateSummary CACHE HIT [${mode}/${language}](v${safeIdx + 1}) content=${contentId}`, Date.now());
      res.status(200).json({
        success: true,
        mode,
        language,
        source: activeVariant.source,
        summary: activeVariant.result,
        cached: true,
      });
      return;
    }

    // 6. First Request (no cache exists): Generate V1
    const t0 = Date.now();
    const { summary, source } = await generateContentSummary(content, mode, language, 1);
    devLog(`generateSummary AI generation V1 [${mode}/${language}] content=${contentId}`, t0);

    const v1 = {
      result: summary,
      source,
      fingerprint: computeNormalizedFingerprint(summary),
      generatedAt: new Date(),
    };

    // 7. Save cache entry in MongoDB with V1
    await AICache.findOneAndUpdate(
      {
        contentId: content._id,
        type: 'SUMMARY',
        modeOrFormat: mode,
        language,
      },
      {
        contentUpdatedAt: content.updatedAt,
        result: summary,
        source,
        generatedAt: new Date(),
        variants: [v1],
        currentVariantIndex: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Asynchronously prepare V2 ahead (do not wait for V2 before responding)
    scheduleNextVariantPrefetch(content._id.toString(), 'SUMMARY', mode, language);

    res.status(200).json({
      success: true,
      mode,
      language,
      source,
      summary,
      cached: false,
    });
  } catch (error: any) {
    const safeMsg = sanitizeAIErrorMessage(error);
    const status =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED')
        ? 429
        : 500;
    res.status(status).json({
      success: false,
      message: safeMsg,
    });
  }
};

/**
 * Generate AI Outreach Draft (WEBSITE, LINKEDIN, X, INSTAGRAM, STUDENT) in English or Hindi
 * Accessible only to SCIENTIST and ADMIN with verified, active accounts.
 * Results are cached in MongoDB per contentId, format, language, and content.updatedAt.
 */
export const generateOutreach = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({
        success: false,
        message: 'Your email address must be verified to access Outreach Studio.',
      });
      return;
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact support.',
      });
      return;
    }

    // Role check: Only SCIENTIST or ADMIN can access Outreach Studio
    if (user.role !== UserRole.SCIENTIST && user.role !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        message:
          'Forbidden. Access to Outreach Studio is restricted to SCIENTIST and ADMIN accounts.',
      });
      return;
    }

    const { contentId } = req.params;
    if (
      !contentId ||
      typeof contentId !== 'string' ||
      !mongoose.Types.ObjectId.isValid(contentId)
    ) {
      res.status(404).json({
        success: false,
        message: 'Scientific content not found.',
      });
      return;
    }

    // 1. Fetch content document
    const content = await Content.findById(contentId);
    if (!content) {
      res.status(404).json({
        success: false,
        message: 'Scientific content not found.',
      });
      return;
    }

    // 2. Only PUBLISHED content can be used in Outreach Studio
    if (content.status !== ContentStatus.PUBLISHED) {
      res.status(400).json({
        success: false,
        message: 'Only published scientific content can be used in Outreach Studio.',
      });
      return;
    }

    // 2b. Backend ownership enforcement: content must belong to the authenticated user
    const contentOwnerId = content.scientist?.toString();
    const currentUserId = req.user?._id?.toString();
    if (!contentOwnerId || contentOwnerId !== currentUserId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You can only generate outreach drafts for your own published research.',
      });
      return;
    }

    // 3. Validate outreach format (Allowed: LINKEDIN, INSTAGRAM; default: LINKEDIN)
    const rawFormat = req.body?.format;
    let format = OutreachFormat.LINKEDIN;

    if (rawFormat) {
      const upperFormat = String(rawFormat).trim().toUpperCase();
      if (
        upperFormat === OutreachFormat.LINKEDIN ||
        upperFormat === OutreachFormat.INSTAGRAM
      ) {
        format = upperFormat as OutreachFormat;
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid outreach format. Allowed formats are: LINKEDIN, INSTAGRAM',
        });
        return;
      }
    }

    // 4. Validate language (default: EN)
    const rawLang = req.body?.language;
    if (rawLang) {
      const upperLang = String(rawLang).trim().toUpperCase();
      if (upperLang !== 'EN' && upperLang !== 'HI') {
        res.status(400).json({
          success: false,
          message: 'Invalid language. Allowed languages are: EN, HI',
        });
        return;
      }
    }
    const language = parseLanguage(rawLang);
    const isRegenerate = Boolean(req.body?.regenerate);

    // 5. Check MongoDB AI Cache
    let cachedEntry = await AICache.findOne({
      contentId: content._id,
      type: 'OUTREACH',
      modeOrFormat: format,
      language,
    });

    // Content update invalidation check: if content changed, delete stale cache and start fresh
    if (
      cachedEntry &&
      cachedEntry.contentUpdatedAt &&
      cachedEntry.contentUpdatedAt.getTime() !== content.updatedAt.getTime()
    ) {
      logger.info(
        `[AICache] Content ${contentId} updatedAt changed. Invalidating old outreach cache [${format}/${language}].`
      );
      await AICache.deleteOne({ _id: cachedEntry._id });
      cachedEntry = null;
    }

    // Invalidate legacy report-style outreach cache if it contains deprecated corporate or report markers
    if (
      cachedEntry &&
      cachedEntry.result &&
      (/POLARIS is pleased to|Research Context:|External Reference:|https?:\/\//i.test(cachedEntry.result))
    ) {
      logger.info(`[AICache] Invalidating legacy report-style outreach cache for ${contentId}.`);
      await AICache.deleteOne({ _id: cachedEntry._id });
      cachedEntry = null;
    }

    if (cachedEntry) {
      ensureVariantsArray(cachedEntry);

      if (isRegenerate) {
        const currentIdx = cachedEntry.currentVariantIndex ?? 0;
        const targetNextIdx = (currentIdx + 1) % MAX_AI_VARIANTS;

        if (targetNextIdx < cachedEntry.variants.length) {
          // Next variant already exists in cache! Return immediately from MongoDB (zero AI calls)
          cachedEntry.currentVariantIndex = targetNextIdx;
          cachedEntry.result = cachedEntry.variants[targetNextIdx].result;
          cachedEntry.source = cachedEntry.variants[targetNextIdx].source;
          await cachedEntry.save();

          // Prefetch following variant asynchronously if total cached < 5
          if (cachedEntry.variants.length < MAX_AI_VARIANTS) {
            scheduleNextVariantPrefetch(content._id.toString(), 'OUTREACH', format, language);
          }

          devLog(`generateOutreach REGENERATE CACHE HIT [${format}/${language}](v${targetNextIdx + 1})`, Date.now());
          res.status(200).json({
            success: true,
            format,
            language,
            source: cachedEntry.variants[targetNextIdx].source,
            draft: cachedEntry.variants[targetNextIdx].result,
            cached: true,
          });
          return;
        }

        // Next variant does not exist yet and variants < 5: generate exactly ONE new variant
        const nextVariantNum = cachedEntry.variants.length + 1;
        const t1 = Date.now();
        let { draft, source } = await generateContentOutreach(content, format, language, nextVariantNum);

        // Duplicate check with at most 1 retry
        if (isDuplicateVariant(draft, cachedEntry.variants)) {
          logger.warn(`Generated outreach variant ${nextVariantNum} was duplicate. Retrying once...`);
          const retry = await generateContentOutreach(content, format, language, nextVariantNum);
          draft = retry.draft;
          source = retry.source;
        }

        const newVariant = {
          result: draft,
          source,
          fingerprint: computeNormalizedFingerprint(draft),
          generatedAt: new Date(),
        };
        cachedEntry.variants.push(newVariant);
        cachedEntry.currentVariantIndex = cachedEntry.variants.length - 1;
        cachedEntry.result = draft;
        cachedEntry.source = source;
        await cachedEntry.save();
        devLog(`generateOutreach REGENERATE AI generation [${format}/${language}](v${nextVariantNum})`, t1);

        // Prefetch following variant if total cached < 5
        if (cachedEntry.variants.length < MAX_AI_VARIANTS) {
          scheduleNextVariantPrefetch(content._id.toString(), 'OUTREACH', format, language);
        }

        res.status(200).json({
          success: true,
          format,
          language,
          source,
          draft,
          cached: false,
        });
        return;
      }

      // Non-regenerate request with existing cache: return active variant
      const currentIdx = cachedEntry.currentVariantIndex ?? 0;
      const safeIdx = currentIdx < cachedEntry.variants.length ? currentIdx : 0;
      const activeVariant = cachedEntry.variants[safeIdx];

      // If only V1 exists (or < 5), ensure next variant is asynchronously prefetched
      if (cachedEntry.variants.length < MAX_AI_VARIANTS) {
        scheduleNextVariantPrefetch(content._id.toString(), 'OUTREACH', format, language);
      }

      devLog(`generateOutreach CACHE HIT [${format}/${language}](v${safeIdx + 1}) content=${contentId}`, Date.now());
      res.status(200).json({
        success: true,
        format,
        language,
        source: activeVariant.source,
        draft: activeVariant.result,
        cached: true,
      });
      return;
    }

    // 6. First Request (no cache exists): Generate V1
    const t1 = Date.now();
    const { draft, source } = await generateContentOutreach(content, format, language, 1);
    devLog(`generateOutreach AI generation V1 [${format}/${language}] content=${contentId}`, t1);

    const v1 = {
      result: draft,
      source,
      fingerprint: computeNormalizedFingerprint(draft),
      generatedAt: new Date(),
    };

    // 7. Save cache entry in MongoDB with V1
    await AICache.findOneAndUpdate(
      {
        contentId: content._id,
        type: 'OUTREACH',
        modeOrFormat: format,
        language,
      },
      {
        contentUpdatedAt: content.updatedAt,
        result: draft,
        source,
        generatedAt: new Date(),
        variants: [v1],
        currentVariantIndex: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Asynchronously prepare V2 ahead (do not wait for V2 before responding)
    scheduleNextVariantPrefetch(content._id.toString(), 'OUTREACH', format, language);

    res.status(200).json({
      success: true,
      format,
      language,
      source,
      draft,
      cached: false,
    });
  } catch (error: any) {
    const safeMsg = sanitizeAIErrorMessage(error);
    const status =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED')
        ? 429
        : 500;
    res.status(status).json({
      success: false,
      message: safeMsg,
    });
  }
};

/**
 * Generate AI Summary for arbitrary user-provided workspace content (PDF, Image, Video, Link).
 * Accessible to authenticated, verified, active users (USER, SCIENTIST, ADMIN).
 * Processed in-memory and discarded without persisting to MongoDB or Cloudinary.
 */
export const generateWorkspaceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to use the research summary workspace.',
      });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({
        success: false,
        message: 'Your email address must be verified to use the AI summary workspace.',
      });
      return;
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact support.',
      });
      return;
    }

    // 1. Parse & Validate inputType
    const rawInputType = req.body?.inputType;
    if (!rawInputType || typeof rawInputType !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid inputType. Allowed types are: PDF, IMAGE, VIDEO, LINK',
      });
      return;
    }

    const upperInputType = rawInputType.trim().toUpperCase();
    if (!['PDF', 'IMAGE', 'VIDEO', 'LINK'].includes(upperInputType)) {
      res.status(400).json({
        success: false,
        message: 'Invalid inputType. Allowed types are: PDF, IMAGE, VIDEO, LINK',
      });
      return;
    }
    const inputType = upperInputType as 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK';

    // 2. Parse & Validate mode (default: QUICK)
    const rawMode = req.body?.mode;
    let mode = SummaryMode.QUICK;
    if (rawMode) {
      const upperMode = String(rawMode).trim().toUpperCase();
      if (Object.values(SummaryMode).includes(upperMode as SummaryMode)) {
        mode = upperMode as SummaryMode;
      } else {
        res.status(400).json({
          success: false,
          message: `Invalid summary mode. Allowed modes are: ${Object.values(SummaryMode).join(', ')}`,
        });
        return;
      }
    }

    // 3. Parse & Validate language (default: EN)
    const rawLang = req.body?.language;
    if (rawLang) {
      const upperLang = String(rawLang).trim().toUpperCase();
      if (upperLang !== 'EN' && upperLang !== 'HI') {
        res.status(400).json({
          success: false,
          message: 'Invalid language. Allowed languages are: EN, HI',
        });
        return;
      }
    }
    const language = parseLanguage(rawLang);

    // 4. Handle FILE inputs (PDF, IMAGE, VIDEO)
    if (inputType === 'PDF' || inputType === 'IMAGE' || inputType === 'VIDEO') {
      const file = req.file;
      if (!file || !file.buffer || file.buffer.length === 0) {
        res.status(400).json({
          success: false,
          message: `File is required for ${inputType} inputType.`,
        });
        return;
      }

      // Max size validations:
      // PDF: 20 MB (20 * 1024 * 1024)
      // IMAGE: 10 MB (10 * 1024 * 1024)
      // VIDEO: 25 MB (25 * 1024 * 1024)
      if (inputType === 'PDF') {
        if (file.size > 20 * 1024 * 1024) {
          res.status(400).json({
            success: false,
            message: 'PDF file size exceeds maximum limit of 20MB.',
          });
          return;
        }

        const isPdfMime =
          file.mimetype === 'application/pdf' ||
          file.originalname?.toLowerCase().endsWith('.pdf');
        if (!isPdfMime) {
          res.status(400).json({
            success: false,
            message: `Unsupported MIME type "${file.mimetype}" for PDF. Only application/pdf files are accepted.`,
          });
          return;
        }

        // Basic PDF header verification
        if (file.buffer.length < 4 || file.buffer.subarray(0, 4).toString() !== '%PDF') {
          res.status(400).json({
            success: false,
            message: 'Uploaded file does not have a valid PDF header (%PDF).',
          });
          return;
        }

        const result = await generateWorkspaceSummaryService(
          {
            inputType: 'PDF',
            buffer: file.buffer,
            mimeType: 'application/pdf',
            filename: file.originalname,
          },
          mode,
          language
        );

        res.status(200).json({
          success: true,
          inputType: 'PDF',
          mode,
          language,
          source: 'UPLOAD',
          summary: result.summary,
        });
        return;
      }

      if (inputType === 'IMAGE') {
        if (file.size > 10 * 1024 * 1024) {
          res.status(400).json({
            success: false,
            message: 'Image file size exceeds maximum limit of 10MB.',
          });
          return;
        }

        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedImageMimes.includes(file.mimetype.toLowerCase())) {
          res.status(400).json({
            success: false,
            message: `Unsupported MIME type "${file.mimetype}" for IMAGE. Accepted formats: JPG, JPEG, PNG, WEBP.`,
          });
          return;
        }

        const result = await generateWorkspaceSummaryService(
          {
            inputType: 'IMAGE',
            buffer: file.buffer,
            mimeType: file.mimetype.toLowerCase(),
            filename: file.originalname,
          },
          mode,
          language
        );

        res.status(200).json({
          success: true,
          inputType: 'IMAGE',
          mode,
          language,
          source: 'UPLOAD',
          summary: result.summary,
        });
        return;
      }

      if (inputType === 'VIDEO') {
        if (file.size > 25 * 1024 * 1024) {
          res.status(400).json({
            success: false,
            message: 'Video file size exceeds maximum limit of 25MB for workspace analysis.',
          });
          return;
        }

        const allowedVideoMimes = ['video/mp4', 'video/webm'];
        if (!allowedVideoMimes.includes(file.mimetype.toLowerCase())) {
          res.status(400).json({
            success: false,
            message: `Unsupported MIME type "${file.mimetype}" for VIDEO. Accepted formats: MP4, WEBM.`,
          });
          return;
        }

        const result = await generateWorkspaceSummaryService(
          {
            inputType: 'VIDEO',
            buffer: file.buffer,
            mimeType: file.mimetype.toLowerCase(),
            filename: file.originalname,
          },
          mode,
          language
        );

        res.status(200).json({
          success: true,
          inputType: 'VIDEO',
          mode,
          language,
          source: 'UPLOAD',
          summary: result.summary,
        });
        return;
      }
    }

    // 5. Handle LINK Input
    if (inputType === 'LINK') {
      const rawUrl = req.body?.url;
      if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
        res.status(400).json({
          success: false,
          message: 'URL is required for LINK inputType.',
        });
        return;
      }

      let fetchedResult;
      try {
        fetchedResult = await validateAndFetchPublicUrl(
          rawUrl.trim(),
          20 * 1024 * 1024, // 20 MB ceiling
          15000 // 15 second timeout
        );
      } catch (fetchErr: any) {
        res.status(400).json({
          success: false,
          message: fetchErr.message || 'Unable to fetch or analyze the provided URL.',
        });
        return;
      }

      const result = await generateWorkspaceSummaryService(
        {
          inputType: 'LINK',
          url: fetchedResult.finalUrl,
          text: fetchedResult.text,
          buffer: fetchedResult.buffer,
          mimeType: fetchedResult.contentType,
        },
        mode,
        language
      );

      res.status(200).json({
        success: true,
        inputType: 'LINK',
        mode,
        language,
        source: 'URL',
        summary: result.summary,
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: 'Unhandled input type.',
    });
  } catch (error: any) {
    const safeMsg = sanitizeAIErrorMessage(error);
    const status =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED')
        ? 429
        : 500;
    res.status(status).json({
      success: false,
      message: safeMsg,
    });
  }
};

