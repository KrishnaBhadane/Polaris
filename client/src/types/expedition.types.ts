import type { IContentItem, ContentType } from './content.types';

export interface IExpeditionSummary {
  name: string;
  slug: string;
  region: string;
  years: number[];
  totalRecords: number;
  typeCounts: Record<ContentType, number>;
  scientistsCount?: number;
}

export interface IExpeditionDetailData {
  expedition: IExpeditionSummary;
  content: IContentItem[];
  scientists: Array<{ name: string; institution?: string }>;
  researchRecords: IContentItem[];
  mediaRecords: IContentItem[];
  activityRecords: IContentItem[];
}

export interface ExpeditionsListResponse {
  success: boolean;
  count: number;
  data: IExpeditionSummary[];
}

export interface ExpeditionDetailResponse {
  success: boolean;
  data: IExpeditionDetailData;
}
