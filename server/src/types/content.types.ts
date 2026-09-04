import { Types } from 'mongoose';

export enum ContentType {
  REPORT = 'REPORT',
  PUBLICATION = 'PUBLICATION',
  DATASET = 'DATASET',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  ACTIVITY = 'ACTIVITY',
}

export enum ContentStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  REMOVED = 'REMOVED',
}

export interface IContent {
  title: string;
  description: string;
  type: ContentType;
  scientist: Types.ObjectId;
  scientistName: string;
  institution: string;
  region?: string;
  expedition?: string;
  year?: number;
  researchTopic?: string;
  keywords: string[];
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  status: ContentStatus;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentInput {
  title: string;
  description: string;
  type: ContentType;
  scientistName: string;
  institution: string;
  region?: string;
  expedition?: string;
  year?: number;
  researchTopic?: string;
  keywords: string[];
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
}
