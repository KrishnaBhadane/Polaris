import { api } from './api';
import type { IContentItem, ContentListResponse, ContentType } from '../types/content.types';

export const getRecentContent = async (): Promise<IContentItem[]> => {
  const response = await api.get<ContentListResponse>('/public/content/recent');
  return response.data?.data || [];
};

export const searchContent = async (
  query?: string,
  typeFilter?: ContentType | 'ALL',
  page: number = 1,
  limit: number = 12
): Promise<{ items: IContentItem[]; total: number }> => {
  const params: Record<string, string | number> = {
    page,
    limit,
  };

  if (query && query.trim().length > 0) {
    params.q = query.trim();
  }

  if (typeFilter && typeFilter !== 'ALL') {
    params.type = typeFilter;
  }

  // If query is provided, use /public/search, otherwise use /public/content
  const endpoint = query && query.trim().length > 0 ? '/public/search' : '/public/content';
  const response = await api.get<ContentListResponse>(endpoint, { params });

  return {
    items: response.data?.data || [],
    total: response.data?.pagination?.total ?? (response.data?.count || response.data?.data?.length || 0),
  };
};

export const getContentById = async (id: string): Promise<IContentItem | null> => {
  const response = await api.get<{ success: boolean; data: IContentItem }>(`/public/content/${id}`);
  return response.data?.data || null;
};

export interface CreateContentPayload {
  title: string;
  description: string;
  type: ContentType;
  institution?: string;
  region?: string;
  expedition?: string;
  year?: number;
  researchTopic?: string;
  keywords: string[];
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
}

export const createContent = async (
  payload: CreateContentPayload
): Promise<{ success: boolean; message: string; data: IContentItem }> => {
  const response = await api.post<{ success: boolean; message: string; data: IContentItem }>(
    '/content',
    payload
  );
  return response.data;
};

export const getMySubmissions = async (): Promise<IContentItem[]> => {
  const response = await api.get<{ success: boolean; count: number; data: IContentItem[] }>(
    '/content/mine'
  );
  return response.data?.data || [];
};

export const getSubmissionById = async (id: string): Promise<IContentItem | null> => {
  const response = await api.get<{ success: boolean; data: IContentItem }>(`/content/${id}`);
  return response.data?.data || null;
};

export const removeContent = async (
  id: string,
  reason?: string
): Promise<{ success: boolean; message: string; data: IContentItem }> => {
  const response = await api.patch<{ success: boolean; message: string; data: IContentItem }>(
    `/content/${id}/remove`,
    { reason }
  );
  return response.data;
};

