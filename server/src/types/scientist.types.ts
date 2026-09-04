import { Types } from 'mongoose';

export enum ScientistVerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IScientistProfile {
  user: Types.ObjectId;
  fullName: string;
  institution: string;
  designation: string;
  researchArea: string;
  officialEmail: string;
  employeeOrScientistId: string;
  idProofUrl: string;
  bio?: string;
  verificationStatus: ScientistVerificationStatus;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScientistApplicationInput {
  fullName: string;
  institution: string;
  designation: string;
  researchArea: string;
  officialEmail: string;
  employeeOrScientistId: string;
  idProofUrl: string;
  bio?: string;
}
