import { api } from './api';
import type { ScientistApplicationData } from '../types/scientist.types';
import type { IContentItem } from '../types/content.types';

export interface AdminPendingScientistsResponse {
  success: boolean;
  count: number;
  data: (ScientistApplicationData & {
    user: {
      _id: string;
      name: string;
      email: string;
      role: string;
      accountStatus: string;
    };
    idProofUrl?: string;
    idProofPublicId?: string;
    idProofResourceType?: string;
    idProofFormat?: string;
  })[];
}

export const getPendingScientistsAdmin = async () => {
  const response = await api.get<AdminPendingScientistsResponse>('/admin/scientists/pending');
  return response.data?.data || [];
};

export const getScientistApplicationByIdAdmin = async (id: string) => {
  const response = await api.get<{ success: boolean; data: any }>(`/admin/scientists/${id}`);
  return response.data?.data || null;
};

export const approveScientistAdmin = async (id: string) => {
  const response = await api.patch<{ success: boolean; message: string; data: any }>(
    `/admin/scientists/${id}/approve`
  );
  return response.data;
};

export const rejectScientistAdmin = async (id: string, rejectionReason: string) => {
  const response = await api.patch<{ success: boolean; message: string; data: any }>(
    `/admin/scientists/${id}/reject`,
    { rejectionReason }
  );
  return response.data;
};

export const getSignedIdProofUrlAdmin = async (applicationId: string) => {
  const response = await api.get<{ success: boolean; signedUrl: string }>(
    `/scientist/id-proof/${applicationId}`
  );
  return response.data;
};

// Content Moderation
export const getPendingContentAdmin = async (): Promise<IContentItem[]> => {
  const response = await api.get<{ success: boolean; count: number; data: IContentItem[] }>(
    '/admin/content/pending'
  );
  return response.data?.data || [];
};

export const getAllContentAdmin = async (status?: string): Promise<IContentItem[]> => {
  const params: Record<string, string> = {};
  if (status && status !== 'ALL') {
    params.status = status;
  }
  const response = await api.get<{ success: boolean; count: number; data: IContentItem[] }>(
    '/admin/content',
    { params }
  );
  return response.data?.data || [];
};

export const approveContentAdmin = async (id: string) => {
  const response = await api.patch<{ success: boolean; message: string; data: IContentItem }>(
    `/admin/content/${id}/approve`
  );
  return response.data;
};

export const rejectContentAdmin = async (id: string, rejectionReason: string) => {
  const response = await api.patch<{ success: boolean; message: string; data: IContentItem }>(
    `/admin/content/${id}/reject`,
    { rejectionReason }
  );
  return response.data;
};

export const removeContentAdmin = async (id: string, reason: string) => {
  const response = await api.patch<{ success: boolean; message: string; data: IContentItem }>(
    `/admin/content/${id}/remove`,
    { reason }
  );
  return response.data;
};

