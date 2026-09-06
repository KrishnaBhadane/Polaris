import { Request, Response, NextFunction } from 'express';
import { uploadToCloudinary } from '../services/cloudinary.service';
import { ContentType } from '../types/content.types';

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const ALLOWED_THUMBNAIL_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm'];
const ALLOWED_PDF_MIMES = ['application/pdf'];

export const uploadThumbnail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No thumbnail file provided for upload.',
      });
      return;
    }

    const mimeType = file.mimetype.toLowerCase();
    const originalName = file.originalname.toLowerCase();

    // Validate MIME type and file extension (JPG, JPEG, PNG, WEBP)
    const isMimeValid = ALLOWED_THUMBNAIL_MIMES.includes(mimeType);
    const isExtValid = /\.(jpg|jpeg|png|webp)$/i.test(originalName);

    if (!isMimeValid && !isExtValid) {
      res.status(400).json({
        success: false,
        message: 'Thumbnail must be a valid image file (JPG, JPEG, PNG, or WEBP).',
      });
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      res.status(400).json({
        success: false,
        message: 'Thumbnail image file size exceeds the 5 MB limit.',
      });
      return;
    }

    // Upload to Cloudinary polaris/thumbnails folder with public delivery for web display
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      'polaris/thumbnails',
      'image',
      file.originalname,
      'upload'
    );

    res.status(200).json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
    });
  } catch (error) {
    next(error);
  }
};


export const uploadScientificContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file provided for upload.',
      });
      return;
    }

    const { type } = req.body;

    // Reject DATASET content uploads (DATASET requires externalUrl)
    if (type === ContentType.DATASET) {
      res.status(400).json({
        success: false,
        message:
          'DATASET content type does not accept file uploads. Please provide an externalUrl directly when submitting content.',
      });
      return;
    }

    const mimeType = file.mimetype.toLowerCase();
    const originalName = file.originalname.toLowerCase();

    let folder = 'polaris/reports';
    let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';

    // 1. Validate PDF (REPORT / PUBLICATION)
    if (
      ALLOWED_PDF_MIMES.includes(mimeType) ||
      originalName.endsWith('.pdf')
    ) {
      if (type && type !== ContentType.REPORT && type !== ContentType.PUBLICATION) {
        res.status(400).json({
          success: false,
          message: `PDF files can only be uploaded for REPORT or PUBLICATION content types. Received type: ${type}`,
        });
        return;
      }

      if (file.size > MAX_PDF_SIZE) {
        res.status(400).json({
          success: false,
          message: 'PDF file size exceeds the 20 MB limit.',
        });
        return;
      }

      folder =
        type === ContentType.PUBLICATION
          ? 'polaris/publications'
          : 'polaris/reports';
      resourceType = 'auto';
    }
    // 2. Validate Image (IMAGE)
    else if (
      ALLOWED_IMAGE_MIMES.includes(mimeType) ||
      /\.(jpg|jpeg|png|webp)$/.test(originalName)
    ) {
      if (type && type !== ContentType.IMAGE) {
        res.status(400).json({
          success: false,
          message: `Image files can only be uploaded for IMAGE content type. Received type: ${type}`,
        });
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        res.status(400).json({
          success: false,
          message: 'Image file size exceeds the 10 MB limit.',
        });
        return;
      }

      folder = 'polaris/images';
      resourceType = 'auto';
    }
    // 3. Validate Video (VIDEO)
    else if (
      ALLOWED_VIDEO_MIMES.includes(mimeType) ||
      /\.(mp4|webm)$/.test(originalName)
    ) {
      if (type && type !== ContentType.VIDEO) {
        res.status(400).json({
          success: false,
          message: `Video files can only be uploaded for VIDEO content type. Received type: ${type}`,
        });
        return;
      }

      if (file.size > MAX_VIDEO_SIZE) {
        res.status(400).json({
          success: false,
          message: 'Video file size exceeds the 100 MB limit.',
        });
        return;
      }

      folder = 'polaris/videos';
      resourceType = 'auto';
    }
    // 4. Unsupported file type
    else {
      res.status(400).json({
        success: false,
        message:
          'Unsupported file type. Supported formats: PDF (.pdf for reports/publications), Images (.jpg, .jpeg, .png, .webp), and Videos (.mp4, .webm).',
      });
      return;
    }

    // Upload to Cloudinary stream
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      folder,
      resourceType,
      file.originalname
    );

    res.status(200).json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
    });
  } catch (error) {
    next(error);
  }
};
