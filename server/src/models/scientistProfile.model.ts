import { Schema, model, Document, Model } from 'mongoose';
import { IScientistProfile, ScientistVerificationStatus } from '../types/scientist.types';

export interface IScientistProfileDocument
  extends Omit<IScientistProfile, 'createdAt' | 'updatedAt'>,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

const scientistProfileSchema = new Schema<IScientistProfileDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    institution: {
      type: String,
      required: [true, 'Institution or university name is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    researchArea: {
      type: String,
      required: [true, 'Research area or domain is required'],
      trim: true,
    },
    officialEmail: {
      type: String,
      required: [true, 'Official or institutional email is required'],
      lowercase: true,
      trim: true,
    },
    employeeOrScientistId: {
      type: String,
      required: [true, 'Employee or Scientist ID is required'],
      trim: true,
    },
    idProofUrl: {
      type: String,
      required: [true, 'ID Proof reference is required'],
      trim: true,
    },
    idProofPublicId: {
      type: String,
      trim: true,
      default: '',
    },
    idProofResourceType: {
      type: String,
      trim: true,
      default: 'image',
    },
    idProofFormat: {
      type: String,
      trim: true,
      default: '',
    },
    idProofDeliveryType: {
      type: String,
      trim: true,
      default: 'authenticated',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: Object.values(ScientistVerificationStatus),
      default: ScientistVerificationStatus.PENDING,
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

export const ScientistProfile: Model<IScientistProfileDocument> =
  model<IScientistProfileDocument>('ScientistProfile', scientistProfileSchema);

export default ScientistProfile;
