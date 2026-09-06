import { api } from './api';
import type { ContentType } from '../types/content.types';

export interface FileUploadResponse {
  success: boolean;
  fileUrl: string;
  publicId: string;
  resourceType: string;
  message?: string;
}

export const uploadScientificFile = async (
  file: File,
  type?: ContentType
): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (type) {
    formData.append('type', type);
  }

  const response = await api.post<FileUploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const uploadThumbnailFile = async (
  file: File
): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<FileUploadResponse>('/upload/thumbnail', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

