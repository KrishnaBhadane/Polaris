export type ScientistVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ScientistApplicationData {
  id: string;
  fullName: string;
  institution: string;
  designation: string;
  researchArea: string;
  officialEmail: string;
  employeeOrScientistId: string;
  idProofUrl?: string;
  idProofPublicId?: string;
  bio?: string;
  verificationStatus: ScientistVerificationStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ScientistStatusResponse {
  success: boolean;
  hasApplied: boolean;
  status: ScientistVerificationStatus | null;
  application: ScientistApplicationData | null;
}

export interface ApplyScientistPayload {
  fullName: string;
  institution: string;
  designation: string;
  researchArea: string;
  officialEmail: string;
  employeeOrScientistId: string;
  idProofPublicId: string;
  idProofResourceType?: string;
  idProofFormat?: string;
  idProofDeliveryType?: string;
  bio?: string;
}

export interface IdProofUploadResponse {
  success: boolean;
  message: string;
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format?: string;
  idProofUrl: string;
}
