import { Request, Response, NextFunction } from 'express';
import { ScientistProfile } from '../models/scientistProfile.model';
import { User } from '../models/user.model';
import { Content } from '../models/content.model';
import { AICache } from '../models/aiCache.model';
import { SiteSettings, getOrCreateSiteSettings } from '../models/siteSettings.model';
import { MarqueeNews } from '../models/marqueeNews.model';
import { ScientistVerificationStatus } from '../types/scientist.types';
import { ContentStatus } from '../types/content.types';
import { UserRole } from '../types/user.types';
import { generateContentSummary, SummaryMode } from '../services/gemini.service';
import { computeNormalizedFingerprint } from '../utils/aiVariant.utils';
import { logger } from '../utils/logger';

/**
 * Pre-generates one summary mode/language pair and writes it to AICache.
 * Skips if a valid cache entry already exists for the current content version.
 * Any error is caught and logged — it never propagates to the caller.
 */
async function preGenerateOneSummary(
  contentId: string,
  mode: SummaryMode
): Promise<void> {
  try {
    const content = await Content.findById(contentId);
    if (!content || content.status !== ContentStatus.PUBLISHED) return;

    // Skip if a valid cache already exists for this content version + mode
    const existing = await AICache.findOne({
      contentId: content._id,
      type: 'SUMMARY',
      modeOrFormat: mode,
      language: 'EN',
    });
    if (
      existing &&
      existing.contentUpdatedAt &&
      existing.contentUpdatedAt.getTime() === content.updatedAt.getTime()
    ) {
      logger.info(`[PreGen] Cache already warm for content ${contentId} [${mode}/EN]. Skipping.`);
      return;
    }

    logger.info(`[PreGen] Starting background ${mode}/EN pre-generation for content ${contentId}...`);
    const t0 = Date.now();
    const { summary, source } = await generateContentSummary(content, mode, 'EN');

    const fingerprint = computeNormalizedFingerprint(summary);
    await AICache.findOneAndUpdate(
      {
        contentId: content._id,
        type: 'SUMMARY',
        modeOrFormat: mode,
        language: 'EN',
      },
      {
        contentUpdatedAt: content.updatedAt,
        result: summary,
        source,
        generatedAt: new Date(),
        variants: [
          {
            result: summary,
            source,
            fingerprint,
            generatedAt: new Date(),
          },
        ],
        currentVariantIndex: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info(
      `[PreGen] ${mode}/EN summary cached for content ${contentId} in ${Date.now() - t0}ms (source: ${source}).`
    );
  } catch (err: any) {
    logger.warn(
      `[PreGen] ${mode}/EN pre-generation failed for content ${contentId}: ${err?.message}. This is non-critical.`
    );
  }
}

/**
 * Fires off background pre-generation of QUICK, STUDENT, and TECHNICAL summaries (EN only)
 * for newly published content. Each mode runs independently so a failure in one does not
 * stop the others. The entire operation is non-blocking and never affects content approval.
 */
async function preGenerateAllSummaries(contentId: string): Promise<void> {
  const modes: SummaryMode[] = [SummaryMode.QUICK, SummaryMode.STUDENT, SummaryMode.TECHNICAL];

  // Run all three modes concurrently. Promise.allSettled ensures every mode is attempted
  // regardless of individual failures.
  const results = await Promise.allSettled(
    modes.map((mode) => preGenerateOneSummary(contentId, mode))
  );

  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      logger.warn(
        `[PreGen] Unexpected rejection for ${modes[idx]}/EN on content ${contentId}: ${result.reason}`
      );
    }
  });
}

export const getPendingScientists = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pendingApplications = await ScientistProfile.find({
      verificationStatus: ScientistVerificationStatus.PENDING,
    })
      .populate('user', 'name email role accountStatus')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingApplications.length,
      data: pendingApplications,
    });
  } catch (error) {
    next(error);
  }
};

export const getScientistById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await ScientistProfile.findById(id)
      .populate('user', 'name email role emailVerified accountStatus')
      .populate('reviewedBy', 'name email role');

    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Scientist application not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const approveScientist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const application = await ScientistProfile.findById(id);

    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Scientist application not found.',
      });
      return;
    }

    if (application.verificationStatus !== ScientistVerificationStatus.PENDING) {
      res.status(409).json({
        success: false,
        message: `Application has already been reviewed with status: ${application.verificationStatus}`,
      });
      return;
    }

    // 1. Update application verification status
    application.verificationStatus = ScientistVerificationStatus.APPROVED;
    application.rejectionReason = '';
    application.reviewedBy = adminUser._id;
    application.reviewedAt = new Date();
    await application.save();

    // 2. Elevate user role to SCIENTIST
    await User.findByIdAndUpdate(application.user, {
      role: UserRole.SCIENTIST,
    });

    res.status(200).json({
      success: true,
      message: 'Scientist application approved successfully. User role updated to SCIENTIST.',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectScientist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = req.user;

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const application = await ScientistProfile.findById(id);

    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Scientist application not found.',
      });
      return;
    }

    if (application.verificationStatus !== ScientistVerificationStatus.PENDING) {
      res.status(409).json({
        success: false,
        message: `Application has already been reviewed with status: ${application.verificationStatus}`,
      });
      return;
    }

    const trimmedReason =
      typeof reason === 'string' && reason.trim().length > 0
        ? reason.trim()
        : 'Application did not meet scientific verification criteria.';

    // 1. Update application status to REJECTED
    application.verificationStatus = ScientistVerificationStatus.REJECTED;
    application.rejectionReason = trimmedReason;
    application.reviewedBy = adminUser._id;
    application.reviewedAt = new Date();
    await application.save();

    // Note: User role remains USER (unchanged)

    res.status(200).json({
      success: true,
      message: 'Scientist application rejected.',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Scientific Content Moderation Controllers
// ==========================================

export const getPendingContent = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pendingContent = await Content.find({
      status: ContentStatus.PENDING,
    })
      .populate('scientist', 'name email role institution')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingContent.length,
      data: pendingContent,
    });
  } catch (error) {
    next(error);
  }
};

export const getContentByIdAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id)
      .populate('scientist', 'name email role institution')
      .populate('reviewedBy', 'name email role');

    if (!content) {
      res.status(404).json({
        success: false,
        message: 'Content not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

export const approveContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const content = await Content.findById(id);

    if (!content) {
      res.status(404).json({
        success: false,
        message: 'Content not found.',
      });
      return;
    }

    if (content.status !== ContentStatus.PENDING) {
      res.status(409).json({
        success: false,
        message: `Content has already been reviewed with status: ${content.status}`,
      });
      return;
    }

    // Update status to PUBLISHED and record reviewer metadata
    content.status = ContentStatus.PUBLISHED;
    content.rejectionReason = '';
    content.reviewedBy = adminUser._id;
    content.reviewedAt = new Date();
    await content.save();

    // Non-blocking background pre-generation: warm QUICK/STUDENT/TECHNICAL EN caches so
    // first user requests for each mode return instantly from cache.
    // Do NOT await — failure must never block the approval response.
    preGenerateAllSummaries(String(content._id)).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Content approved and published successfully.',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = req.user;

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required.',
      });
      return;
    }

    const content = await Content.findById(id);

    if (!content) {
      res.status(404).json({
        success: false,
        message: 'Content not found.',
      });
      return;
    }

    if (content.status !== ContentStatus.PENDING) {
      res.status(409).json({
        success: false,
        message: `Content has already been reviewed with status: ${content.status}`,
      });
      return;
    }

    // Update status to REJECTED and record reviewer metadata
    content.status = ContentStatus.REJECTED;
    content.rejectionReason = reason.trim();
    content.reviewedBy = adminUser._id;
    content.reviewedAt = new Date();
    await content.save();

    res.status(200).json({
      success: true,
      message: 'Content rejected.',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllContentAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: Record<string, any> = {};

    if (
      status &&
      typeof status === 'string' &&
      Object.values(ContentStatus).includes(status as ContentStatus)
    ) {
      filter.status = status;
    }

    const content = await Content.find(filter)
      .populate('scientist', 'name email role institution')
      .populate('reviewedBy', 'name email role')
      .populate('removedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: content.length,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

export const removeContentAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = req.user;

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Removal reason is required for admin content removal.',
      });
      return;
    }

    const content = await Content.findById(id);

    if (!content) {
      res.status(404).json({
        success: false,
        message: 'Content not found.',
      });
      return;
    }

    if (content.status === ContentStatus.REMOVED) {
      res.status(409).json({
        success: false,
        message: 'Content is already removed.',
      });
      return;
    }

    // Admin can remove any PUBLISHED, PENDING, or REJECTED content
    content.status = ContentStatus.REMOVED;
    content.removedBy = adminUser._id;
    content.removedAt = new Date();
    content.removalReason = reason.trim();
    await content.save();

    res.status(200).json({
      success: true,
      message: 'Content removed by administrator.',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Marquee Announcement settings (Admin view, includes audit metadata)
 */
export const getAdminMarqueeSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getOrCreateSiteSettings();
    res.status(200).json({
      success: true,
      data: settings.marqueeAnnouncement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Marquee Announcement settings (Admin only)
 */
export const updateMarqueeSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { textEn, textHi, enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Field "enabled" must be a boolean value.',
      });
      return;
    }

    const cleanTextEn = typeof textEn === 'string' ? textEn.trim() : '';
    const cleanTextHi = typeof textHi === 'string' ? textHi.trim() : '';

    if (cleanTextEn.length > 180) {
      res.status(400).json({
        success: false,
        message: 'English announcement text must not exceed 180 characters.',
      });
      return;
    }

    if (cleanTextHi.length > 250) {
      res.status(400).json({
        success: false,
        message: 'Hindi announcement text must not exceed 250 characters.',
      });
      return;
    }

    const settings = await getOrCreateSiteSettings();
    settings.marqueeAnnouncement = {
      textEn: cleanTextEn,
      textHi: cleanTextHi,
      enabled,
      updatedBy: adminUser._id,
      updatedAt: new Date(),
    };

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Marquee announcement updated successfully.',
      data: settings.marqueeAnnouncement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Marquee News announcement (Admin only, 24-hour TTL)
 */
export const createMarqueeNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { textEn, textHi, enabled } = req.body;

    if (!textEn || typeof textEn !== 'string' || textEn.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'English announcement text is required.',
      });
      return;
    }

    const cleanTextEn = textEn.trim();
    const cleanTextHi = typeof textHi === 'string' ? textHi.trim() : '';

    if (cleanTextEn.length > 180) {
      res.status(400).json({
        success: false,
        message: 'English announcement text must not exceed 180 characters.',
      });
      return;
    }

    if (cleanTextHi.length > 180) {
      res.status(400).json({
        success: false,
        message: 'Hindi announcement text must not exceed 180 characters.',
      });
      return;
    }

    const isEnabled = typeof enabled === 'boolean' ? enabled : true;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from creation

    const news = await MarqueeNews.create({
      textEn: cleanTextEn,
      textHi: cleanTextHi,
      enabled: isEnabled,
      createdBy: adminUser._id,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: 'News announcement created successfully.',
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Marquee News announcements (Admin view, including active, disabled, and expiry)
 */
export const getAdminMarqueeNews = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const news = await MarqueeNews.find()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: news.length,
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a Marquee News announcement (Admin only)
 */
export const updateAdminMarqueeNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { textEn, textHi, enabled } = req.body;

    const news = await MarqueeNews.findById(id);
    if (!news) {
      res.status(404).json({
        success: false,
        message: 'News announcement not found.',
      });
      return;
    }

    if (textEn !== undefined) {
      if (typeof textEn !== 'string' || textEn.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'English announcement text cannot be empty.',
        });
        return;
      }
      if (textEn.trim().length > 180) {
        res.status(400).json({
          success: false,
          message: 'English announcement text must not exceed 180 characters.',
        });
        return;
      }
      news.textEn = textEn.trim();
    }

    if (textHi !== undefined) {
      if (typeof textHi === 'string' && textHi.trim().length > 180) {
        res.status(400).json({
          success: false,
          message: 'Hindi announcement text must not exceed 180 characters.',
        });
        return;
      }
      news.textHi = typeof textHi === 'string' ? textHi.trim() : '';
    }

    if (typeof enabled === 'boolean') {
      news.enabled = enabled;
    }

    await news.save();

    res.status(200).json({
      success: true,
      message: 'News announcement updated successfully.',
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a Marquee News announcement manually (Admin only)
 */
export const deleteAdminMarqueeNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const news = await MarqueeNews.findByIdAndDelete(id);

    if (!news) {
      res.status(404).json({
        success: false,
        message: 'News announcement not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'News announcement removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

