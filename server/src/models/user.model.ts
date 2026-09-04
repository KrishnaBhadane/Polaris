import { Schema, model, Document, Model } from 'mongoose';
import { IUser, UserRole, AccountStatus } from '../types/user.types';

export interface IUserDocument extends Omit<IUser, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

export const User: Model<IUserDocument> = model<IUserDocument>('User', userSchema);
export default User;
