import mongoose, { Document, Schema, Model } from 'mongoose';

export type AICacheType = 'SUMMARY' | 'OUTREACH';
export type AICacheLanguage = 'EN' | 'HI';

export interface IAICacheVariant {
  result: string;
  source: string;
  fingerprint: string;
  generatedAt: Date;
}

export interface IAICacheDocument extends Document {
  contentId: mongoose.Types.ObjectId;
  type: AICacheType;
  modeOrFormat: string;
  language: AICacheLanguage;
  contentUpdatedAt: Date;
  result: string;
  source: string;
  generatedAt: Date;
  variants: IAICacheVariant[];
  currentVariantIndex: number;
}

const aiCacheSchema = new Schema<IAICacheDocument>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['SUMMARY', 'OUTREACH'],
      required: true,
      index: true,
    },
    modeOrFormat: {
      type: String,
      required: true,
      index: true,
    },
    language: {
      type: String,
      enum: ['EN', 'HI'],
      default: 'EN',
      required: true,
      index: true,
    },
    contentUpdatedAt: {
      type: Date,
      required: true,
    },
    result: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    variants: {
      type: [
        {
          result: { type: String, required: true },
          source: { type: String, required: true },
          fingerprint: { type: String, required: true },
          generatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    currentVariantIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for fast lookups and prevention of duplicate cache records
aiCacheSchema.index(
  { contentId: 1, type: 1, modeOrFormat: 1, language: 1 },
  { unique: true }
);

export const AICache: Model<IAICacheDocument> =
  mongoose.models.AICache ||
  mongoose.model<IAICacheDocument>('AICache', aiCacheSchema);
