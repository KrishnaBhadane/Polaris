import { Request, Response, NextFunction } from 'express';
import { Content } from '../models/content.model';
import { ScientistProfile } from '../models/scientistProfile.model';
import { ContentType, ContentStatus } from '../types/content.types';
import { UserRole } from '../types/user.types';

export const createContent = async (
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

    const {
      title,
      description,
      type,
      institution,
      region,
      expedition,
      year,
      researchTopic,
      keywords,
      fileUrl,
      externalUrl,
      thumbnailUrl,
    } = req.body;

    // 1. Basic validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Title is required.',
      });
      return;
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Description is required.',
      });
      return;
    }

    if (!type || !Object.values(ContentType).includes(type)) {
      res.status(400).json({
        success: false,
        message: `Valid content type is required. Choose from: ${Object.values(ContentType).join(', ')}`,
      });
      return;
    }

    if (
      !keywords ||
      !Array.isArray(keywords) ||
      keywords.length === 0 ||
      keywords.some((k) => typeof k !== 'string' || k.trim().length === 0)
    ) {
      res.status(400).json({
        success: false,
        message: 'At least one valid keyword is required.',
      });
      return;
    }

    const trimmedFileUrl = typeof fileUrl === 'string' ? fileUrl.trim() : '';
    const trimmedExternalUrl = typeof externalUrl === 'string' ? externalUrl.trim() : '';

    // 2. Type-specific URL rules
    if (type === ContentType.DATASET && !trimmedExternalUrl) {
      res.status(400).json({
        success: false,
        message: 'DATASET content type requires an external URL (e.g. DOI, repository link).',
      });
      return;
    }

    if (type === ContentType.VIDEO && !trimmedFileUrl && !trimmedExternalUrl) {
      res.status(400).json({
        success: false,
        message: 'VIDEO content type requires either a file URL or an external video URL.',
      });
      return;
    }

    // 3. Retrieve scientist profile for metadata defaults
    const profile = await ScientistProfile.findOne({ user: user._id });
    const scientistName = profile ? profile.fullName : user.name;
    const resolvedInstitution =
      typeof institution === 'string' && institution.trim().length > 0
        ? institution.trim()
        : profile
        ? profile.institution
        : 'POLARIS Research Network';

    const cleanKeywords = keywords.map((k: string) => k.trim());

    // 4. Create content record with enforced PENDING status and logged-in scientist ID
    const content = await Content.create({
      title: title.trim(),
      description: description.trim(),
      type,
      scientist: user._id, // Enforced from authenticated user, never body
      scientistName,
      institution: resolvedInstitution,
      region: typeof region === 'string' ? region.trim() : '',
      expedition: typeof expedition === 'string' ? expedition.trim() : '',
      year: typeof year === 'number' ? year : undefined,
      researchTopic: typeof researchTopic === 'string' ? researchTopic.trim() : '',
      keywords: cleanKeywords,
      fileUrl: trimmedFileUrl,
      externalUrl: trimmedExternalUrl,
      thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl.trim() : '',
      status: ContentStatus.PENDING, // Strictly PENDING
    });

    res.status(201).json({
      success: true,
      message: 'Scientific content submitted successfully. It is pending review.',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyContent = async (
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

    const submissions = await Content.find({ scientist: user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

export const getContentById = async (
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

    const { id } = req.params;
    const content = await Content.findById(id).populate('scientist', 'name email role');

    if (!content) {
      res.status(404).json({
        success: false,
        message: 'Content not found.',
      });
      return;
    }

    // Access control: ADMIN can view any submission; SCIENTIST can view their own submission
    const isOwner = content.scientist._id.toString() === user._id.toString();
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to view this submission.',
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
