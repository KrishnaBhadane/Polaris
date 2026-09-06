import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Content } from '../models/content.model';
import { getOrCreateSiteSettings } from '../models/siteSettings.model';
import { MarqueeNews } from '../models/marqueeNews.model';
import { ContentStatus, ContentType } from '../types/content.types';

export const PUBLIC_CONTENT_FIELDS =
  'title description type scientistName institution region expedition year researchTopic keywords fileUrl externalUrl thumbnailUrl createdAt updatedAt';

/**
 * GET /api/public/content
 * Returns all PUBLISHED content, newest first.
 * Supports optional filters: type, region, year, researchTopic.
 */
export const getPublicContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, region, year, researchTopic } = req.query;

    const filter: Record<string, any> = {
      status: ContentStatus.PUBLISHED,
    };

    if (
      type &&
      typeof type === 'string' &&
      Object.values(ContentType).includes(type as ContentType)
    ) {
      filter.type = type;
    }

    if (region && typeof region === 'string' && region.trim().length > 0) {
      filter.region = { $regex: region.trim(), $options: 'i' };
    }

    if (year) {
      const parsedYear = parseInt(year as string, 10);
      if (!isNaN(parsedYear)) {
        filter.year = parsedYear;
      }
    }

    if (
      researchTopic &&
      typeof researchTopic === 'string' &&
      researchTopic.trim().length > 0
    ) {
      filter.researchTopic = { $regex: researchTopic.trim(), $options: 'i' };
    }

    const content = await Content.find(filter)
      .select(PUBLIC_CONTENT_FIELDS)
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

/**
 * GET /api/public/content/recent
 * Returns latest 12 PUBLISHED items, newest first.
 */
export const getRecentContent = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recentContent = await Content.find({
      status: ContentStatus.PUBLISHED,
    })
      .select(PUBLIC_CONTENT_FIELDS)
      .sort({ createdAt: -1 })
      .limit(12);

    res.status(200).json({
      success: true,
      count: recentContent.length,
      data: recentContent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/content/:id
 * Returns a single PUBLISHED content item by ID.
 * Returns 404 if not found or if status is not PUBLISHED.
 */
export const getPublicContentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Content not found.',
      });
      return;
    }

    const content = await Content.findOne({
      _id: id,
      status: ContentStatus.PUBLISHED,
    }).select(PUBLIC_CONTENT_FIELDS);

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

/**
 * Escape special regex characters in user search queries to prevent regex injection or crashes.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * GET /api/public/search
 * Unified search across published content records with pagination and multi-field query matching.
 */
export const searchPublicContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, type, region, year, researchTopic, page, limit } = req.query;

    const filter: Record<string, any> = {
      status: ContentStatus.PUBLISHED,
    };

    // 1. Text search across 8 core fields
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { keywords: searchRegex },
        { scientistName: searchRegex },
        { institution: searchRegex },
        { region: searchRegex },
        { expedition: searchRegex },
        { researchTopic: searchRegex },
      ];
    }

    // 2. Structured query filters
    if (
      type &&
      typeof type === 'string' &&
      Object.values(ContentType).includes(type as ContentType)
    ) {
      filter.type = type;
    }

    if (region && typeof region === 'string' && region.trim().length > 0) {
      filter.region = { $regex: escapeRegex(region.trim()), $options: 'i' };
    }

    if (year) {
      const parsedYear = parseInt(year as string, 10);
      if (!isNaN(parsedYear)) {
        filter.year = parsedYear;
      }
    }

    if (
      researchTopic &&
      typeof researchTopic === 'string' &&
      researchTopic.trim().length > 0
    ) {
      filter.researchTopic = {
        $regex: escapeRegex(researchTopic.trim()),
        $options: 'i',
      };
    }

    // 3. Pagination calculation (default page 1, default limit 12, max limit 50)
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const rawLimit = parseInt(limit as string, 10) || 12;
    const limitNum = Math.min(50, Math.max(1, rawLimit));
    const skip = (pageNum - 1) * limitNum;

    // 4. Query execution
    const [total, data] = await Promise.all([
      Content.countDocuments(filter),
      Content.find(filter)
        .select(PUBLIC_CONTENT_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createExpeditionSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * GET /api/public/expeditions
 * Returns distinct expeditions derived from PUBLISHED content with summary counts.
 */
export const getPublicExpeditions = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publishedContent = await Content.find({
      status: ContentStatus.PUBLISHED,
      expedition: { $exists: true, $ne: '' },
    })
      .select(PUBLIC_CONTENT_FIELDS)
      .sort({ createdAt: -1 });

    const expeditionMap = new Map<
      string,
      {
        name: string;
        slug: string;
        region?: string;
        years: Set<number>;
        totalRecords: number;
        typeCounts: Record<string, number>;
        scientists: Set<string>;
      }
    >();

    publishedContent.forEach((item) => {
      const expName = item.expedition?.trim();
      if (!expName) return;

      const slug = createExpeditionSlug(expName);
      if (!slug) return;

      if (!expeditionMap.has(slug)) {
        expeditionMap.set(slug, {
          name: expName,
          slug,
          region: item.region || undefined,
          years: new Set<number>(),
          totalRecords: 0,
          typeCounts: {
            REPORT: 0,
            PUBLICATION: 0,
            DATASET: 0,
            IMAGE: 0,
            VIDEO: 0,
            ACTIVITY: 0,
          },
          scientists: new Set<string>(),
        });
      }

      const exp = expeditionMap.get(slug)!;
      exp.totalRecords += 1;
      if (item.type && exp.typeCounts[item.type] !== undefined) {
        exp.typeCounts[item.type] += 1;
      }
      if (item.year) {
        exp.years.add(item.year);
      }
      if (item.scientistName) {
        exp.scientists.add(item.scientistName);
      }
      if (!exp.region && item.region) {
        exp.region = item.region;
      }
    });

    const expeditions = Array.from(expeditionMap.values())
      .map((exp) => ({
        name: exp.name,
        slug: exp.slug,
        region: exp.region || 'Polar Region',
        years: Array.from(exp.years).sort((a, b) => a - b),
        totalRecords: exp.totalRecords,
        typeCounts: exp.typeCounts,
        scientistsCount: exp.scientists.size,
      }))
      .sort((a, b) => {
        const latestA = a.years[a.years.length - 1] || 0;
        const latestB = b.years[b.years.length - 1] || 0;
        if (latestB !== latestA) return latestB - latestA;
        return b.totalRecords - a.totalRecords;
      });

    res.status(200).json({
      success: true,
      count: expeditions.length,
      data: expeditions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/expeditions/:slug
 * Returns all PUBLISHED records, scientists, and media for a specific expedition slug.
 */
export const getPublicExpeditionBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    if (!slug) {
      res.status(400).json({
        success: false,
        message: 'Expedition slug is required.',
      });
      return;
    }

    const allPublished = await Content.find({
      status: ContentStatus.PUBLISHED,
      expedition: { $exists: true, $ne: '' },
    })
      .select(PUBLIC_CONTENT_FIELDS)
      .sort({ createdAt: -1 });

    const targetSlug = String(slug).toLowerCase().trim();
    const matchingContent = allPublished.filter((item) => {
      return item.expedition && createExpeditionSlug(item.expedition) === targetSlug;
    });

    if (matchingContent.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Expedition not found.',
      });
      return;
    }

    const firstItem = matchingContent[0];
    const canonicalName = firstItem.expedition!.trim();
    const years = Array.from(
      new Set(matchingContent.map((c) => c.year).filter((y): y is number => Boolean(y)))
    ).sort((a, b) => a - b);

    const typeCounts: Record<string, number> = {
      REPORT: 0,
      PUBLICATION: 0,
      DATASET: 0,
      IMAGE: 0,
      VIDEO: 0,
      ACTIVITY: 0,
    };

    matchingContent.forEach((item) => {
      if (item.type && typeCounts[item.type] !== undefined) {
        typeCounts[item.type] += 1;
      }
    });

    // Deduplicate scientists with institution
    const scientistMap = new Map<string, { name: string; institution?: string }>();
    matchingContent.forEach((item) => {
      if (item.scientistName && item.scientistName.trim()) {
        const name = item.scientistName.trim();
        if (!scientistMap.has(name.toLowerCase())) {
          scientistMap.set(name.toLowerCase(), {
            name,
            institution: item.institution || undefined,
          });
        }
      }
    });

    const scientists = Array.from(scientistMap.values());

    const researchRecords = matchingContent.filter((c) =>
      ['REPORT', 'PUBLICATION', 'DATASET'].includes(c.type)
    );
    const mediaRecords = matchingContent.filter((c) => ['IMAGE', 'VIDEO'].includes(c.type));
    const activityRecords = matchingContent.filter((c) => c.type === 'ACTIVITY');

    res.status(200).json({
      success: true,
      data: {
        expedition: {
          name: canonicalName,
          slug,
          region: firstItem.region || 'Polar Region',
          years,
          totalRecords: matchingContent.length,
          typeCounts,
        },
        content: matchingContent,
        scientists,
        researchRecords,
        mediaRecords,
        activityRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/settings/marquee
 * Returns public marquee announcement setting without exposing internal audit metadata.
 */
export const getPublicMarqueeAnnouncement = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getOrCreateSiteSettings();
    const { enabled, textEn, textHi } = settings.marqueeAnnouncement;

    res.status(200).json({
      enabled: Boolean(enabled),
      textEn: textEn || '',
      textHi: textHi || '',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/marquee-news
 * Returns all active, enabled, non-expired announcements, newest first.
 * Strictly checks expiresAt > current time.
 * Does not expose createdBy or internal admin metadata.
 */
export const getPublicMarqueeNews = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();
    const activeNews = await MarqueeNews.find({
      enabled: true,
      expiresAt: { $gt: now },
    })
      .select('_id textEn textHi createdAt expiresAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: activeNews.length,
      items: activeNews,
    });
  } catch (error) {
    next(error);
  }
};


