import { UploadApiResponse } from 'cloudinary';
import cloudinary from '../config/cloudinary';

export interface CloudinaryUploadResult {
  fileUrl: string;
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format?: string;
}

/**
 * Upload a file buffer to Cloudinary using a stream.
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto',
  filename?: string,
  deliveryType: 'upload' | 'authenticated' | 'private' = 'upload'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        type: deliveryType,
        use_filename: true,
        unique_filename: true,
        public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed.'));
        }
        resolve({
          fileUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          deliveryType: result.type,
          format: result.format,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Generate a time-limited signed URL for authenticated Cloudinary assets.
 */
export const generateSignedDownloadUrl = (
  publicId: string,
  format?: string,
  resourceType: string = 'image',
  expiresInSeconds: number = 3600
): string => {
  return cloudinary.utils.private_download_url(publicId, format || '', {
    resource_type: resourceType,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
};

