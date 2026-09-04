import { Schema, model, Document, Model } from 'mongoose';

export interface IOtp {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IOtpDocument extends IOtp, Document {}

const otpSchema = new Schema<IOtpDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically delete when expired
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Otp: Model<IOtpDocument> = model<IOtpDocument>('Otp', otpSchema);
export default Otp;
