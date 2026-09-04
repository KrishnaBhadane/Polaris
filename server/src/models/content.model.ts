import { Schema, model, Document, Model } from 'mongoose';
import { IContent, ContentType, ContentStatus } from '../types/content.types';

export interface IContentDocument
  extends Omit<IContent, 'createdAt' | 'updatedAt'>,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

const contentSchema = new Schema<IContentDocument>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: Object.values(ContentType),
        message: '{VALUE} is not a valid content type',
      },
      required: [true, 'Content type is required'],
      index: true,
    },
    scientist: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Scientist reference is required'],
      index: true,
    },
    scientistName: {
      type: String,
      required: [true, 'Scientist name is required'],
      trim: true,
    },
    institution: {
      type: String,
      required: [true, 'Institution is required'],
      trim: true,
    },
    region: {
      type: String,
      trim: true,
      default: '',
    },
    expedition: {
      type: String,
      trim: true,
      default: '',
    },
    year: {
      type: Number,
      min: [1900, 'Year must be after 1900'],
      max: [2100, 'Year must be valid'],
    },
    researchTopic: {
      type: String,
      trim: true,
      default: '',
    },
    keywords: {
      type: [String],
      required: [true, 'At least one keyword is required'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one keyword is required',
      },
      index: true,
    },
    fileUrl: {
      type: String,
      trim: true,
      default: '',
    },
    externalUrl: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ContentStatus),
        message: '{VALUE} is not a valid content status',
      },
      default: ContentStatus.PENDING,
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient public query filtering by status, type, and date
contentSchema.index({ status: 1, type: 1, createdAt: -1 });

export const Content: Model<IContentDocument> = model<IContentDocument>(
  'Content',
  contentSchema
);

export default Content;
