import mongoose, { Document, Schema } from 'mongoose';

export interface IMarqueeNewsDocument extends Document {
  textEn: string;
  textHi: string;
  enabled: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

const marqueeNewsSchema = new Schema<IMarqueeNewsDocument>(
  {
    textEn: {
      type: String,
      required: [true, 'English announcement text is required.'],
      trim: true,
      maxlength: [180, 'English announcement must not exceed 180 characters.'],
    },
    textHi: {
      type: String,
      default: '',
      trim: true,
      maxlength: [180, 'Hindi announcement must not exceed 180 characters.'],
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// MongoDB TTL Index for automatic expiry cleanup
marqueeNewsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MarqueeNews = mongoose.model<IMarqueeNewsDocument>(
  'MarqueeNews',
  marqueeNewsSchema
);

export default MarqueeNews;
