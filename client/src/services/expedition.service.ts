import { api } from './api';
import type {
  IExpeditionSummary,
  IExpeditionDetailData,
  ExpeditionsListResponse,
  ExpeditionDetailResponse,
} from '../types/expedition.types';

export const createExpeditionSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getExpeditions = async (): Promise<IExpeditionSummary[]> => {
  const response = await api.get<ExpeditionsListResponse>('/public/expeditions');
  return response.data?.data || [];
};

export const getExpeditionBySlug = async (
  slug: string
): Promise<IExpeditionDetailData | null> => {
  const response = await api.get<ExpeditionDetailResponse>(`/public/expeditions/${slug}`);
  return response.data?.data || null;
};
