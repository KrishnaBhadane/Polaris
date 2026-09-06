export type ContentType =
  | 'REPORT'
  | 'PUBLICATION'
  | 'DATASET'
  | 'IMAGE'
  | 'VIDEO'
  | 'ACTIVITY';

export type ContentStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'REMOVED';

export interface IContentItem {
  _id: string;
  title: string;
  description?: string;
  type: ContentType;
  scientist?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
    institution?: string;
  } | string;
  scientistName: string;
  institution?: string;
  region?: string;
  expedition?: string;
  year?: number;
  researchTopic?: string;
  keywords?: string[];
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  status?: ContentStatus;
  rejectionReason?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  } | string | null;
  reviewedAt?: string | null;
  removedBy?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  } | string | null;
  removedAt?: string | null;
  removalReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ContentListResponse {
  success: boolean;
  count?: number;
  data: IContentItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
