import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMarqueeAnnouncement {
  textEn: string;
  textHi: string;
  enabled: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt?: Date;
}

export interface ISiteSettingsDocument extends Document {
  marqueeAnnouncement: IMarqueeAnnouncement;
  createdAt: Date;
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettingsDocument>(
  {
    marqueeAnnouncement: {
      textEn: {
        type: String,
        trim: true,
        maxlength: 180,
        default: '',
      },
      textHi: {
        type: String,
        trim: true,
        maxlength: 250,
        default: '',
      },
      enabled: {
        type: Boolean,
        default: false,
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const SiteSettings: Model<ISiteSettingsDocument> =
  mongoose.models.SiteSettings ||
  mongoose.model<ISiteSettingsDocument>('SiteSettings', siteSettingsSchema);

/**
 * Singleton helper: always retrieves or creates the single SiteSettings document.
 */
export async function getOrCreateSiteSettings(): Promise<ISiteSettingsDocument> {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({
      marqueeAnnouncement: {
        textEn: '',
        textHi: '',
        enabled: false,
        updatedAt: new Date(),
      },
    });
  }
  return settings;
}
