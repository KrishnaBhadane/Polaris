import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ScientistProfile } from '../models/scientistProfile.model';
import { ScientistVerificationStatus } from '../types/scientist.types';
import { AccountStatus, UserRole } from '../types/user.types';
import {
  uploadToCloudinary,
  generateSignedDownloadUrl,
} from '../services/cloudinary.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ID_PROOF_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_ID_PROOF_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

export const uploadScientistIdProof = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({
        success: false,
        message: 'Your email address must be verified before uploading ID proof.',
      });
      return;
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact support.',
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file provided for ID proof upload.',
      });
      return;
    }

    const mimeType = file.mimetype.toLowerCase();
    const originalName = file.originalname.toLowerCase();

    const isAllowedMime = ALLOWED_ID_PROOF_MIMES.includes(mimeType);
    const isAllowedExt = /\.(jpg|jpeg|png|pdf)$/.test(originalName);

    if (!isAllowedMime && !isAllowedExt) {
      res.status(400).json({
        success: false,
        message:
          'Unsupported file format. Accepted formats for ID proof are JPG, JPEG, PNG, and PDF.',
      });
      return;
    }

    if (file.size > MAX_ID_PROOF_SIZE) {
      res.status(400).json({
        success: false,
        message: 'ID proof file size exceeds the 5 MB limit.',
      });
      return;
    }

    // Upload with type: "authenticated" to prevent unsigned public CDN access
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      'polaris/scientist-verification',
      'auto',
      `id_proof_${user._id}_${Date.now()}`,
      'authenticated'
    );

    // Return private asset metadata - NEVER return a raw public/unsigned secure_url
    res.status(200).json({
      success: true,
      message: 'ID proof uploaded securely as authenticated asset.',
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
      deliveryType: 'authenticated',
      format: uploadResult.format,
      idProofUrl: uploadResult.publicId, // reference for apply form
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/scientist/id-proof/:applicationId
 * Generates a signed, time-limited download URL for an authenticated scientist ID proof.
 * Accessible ONLY by the applicant or an ADMIN.
 */
export const getScientistIdProof = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { applicationId } = req.params;
    let profile = null;

    if (applicationId && typeof applicationId === 'string' && mongoose.Types.ObjectId.isValid(applicationId)) {
      profile = await ScientistProfile.findById(applicationId);
      if (!profile) {
        profile = await ScientistProfile.findOne({ user: applicationId });
      }
    }

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Scientist application not found.',
      });
      return;
    }

    // Authorization: Applicant or ADMIN
    const isApplicant = profile.user.toString() === user._id.toString();
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isApplicant && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Access restricted to the applicant or administrators.',
      });
      return;
    }

    const publicId = profile.idProofPublicId || profile.idProofUrl;
    if (!publicId) {
      res.status(404).json({
        success: false,
        message: 'No ID proof document found for this application.',
      });
      return;
    }

    const resourceType = profile.idProofResourceType || 'image';
    const format = profile.idProofFormat || (publicId.endsWith('.pdf') ? 'pdf' : undefined);

    // Generate signed download URL valid for 1 hour (3600 seconds)
    const signedUrl = generateSignedDownloadUrl(publicId, format, resourceType, 3600);

    res.status(200).json({
      success: true,
      signedUrl,
      expiresIn: 3600,
      publicId,
      resourceType,
      deliveryType: 'authenticated',
    });
  } catch (error) {
    next(error);
  }
};



export const applyScientist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // 1. Verify user eligibility
    if (!user.emailVerified) {
      res.status(403).json({
        success: false,
        message: 'Your email address must be verified before applying as a scientist.',
      });
      return;
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Your account is suspended. Please contact support.',
      });
      return;
    }

    const {
      fullName,
      institution,
      designation,
      researchArea,
      officialEmail,
      employeeOrScientistId,
      idProofUrl,
      idProofPublicId,
      idProofResourceType,
      idProofFormat,
      idProofDeliveryType,
      bio,
    } = req.body;

    // 2. Validate input fields
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Full name is required.',
      });
      return;
    }

    if (!institution || typeof institution !== 'string' || institution.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Institution or university name is required.',
      });
      return;
    }

    if (!designation || typeof designation !== 'string' || designation.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Designation is required.',
      });
      return;
    }

    if (!researchArea || typeof researchArea !== 'string' || researchArea.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Research area or domain is required.',
      });
      return;
    }

    if (
      !officialEmail ||
      typeof officialEmail !== 'string' ||
      !EMAIL_REGEX.test(officialEmail.trim())
    ) {
      res.status(400).json({
        success: false,
        message: 'A valid official/institutional email address is required.',
      });
      return;
    }

    if (
      !employeeOrScientistId ||
      typeof employeeOrScientistId !== 'string' ||
      employeeOrScientistId.trim().length === 0
    ) {
      res.status(400).json({
        success: false,
        message: 'Employee or Scientist ID is required.',
      });
      return;
    }

    const resolvedIdProofPublicId =
      typeof idProofPublicId === 'string' && idProofPublicId.trim().length > 0
        ? idProofPublicId.trim()
        : typeof idProofUrl === 'string' && idProofUrl.trim().length > 0
        ? idProofUrl.trim()
        : '';

    if (!resolvedIdProofPublicId) {
      res.status(400).json({
        success: false,
        message: 'ID proof document reference (publicId) is required.',
      });
      return;
    }

    const trimmedFullName = fullName.trim();
    const trimmedInstitution = institution.trim();
    const trimmedDesignation = designation.trim();
    const trimmedResearchArea = researchArea.trim();
    const normalizedOfficialEmail = officialEmail.trim().toLowerCase();
    const trimmedEmployeeId = employeeOrScientistId.trim();
    const resolvedResourceType = typeof idProofResourceType === 'string' ? idProofResourceType.trim() : 'image';
    const resolvedFormat = typeof idProofFormat === 'string' ? idProofFormat.trim() : (resolvedIdProofPublicId.endsWith('.pdf') ? 'pdf' : undefined);
    const resolvedDeliveryType = typeof idProofDeliveryType === 'string' ? idProofDeliveryType.trim() : 'authenticated';
    const trimmedBio = typeof bio === 'string' ? bio.trim() : '';

    // 3. Check for existing application
    const existingProfile = await ScientistProfile.findOne({ user: user._id });

    if (existingProfile) {
      if (existingProfile.verificationStatus === ScientistVerificationStatus.APPROVED) {
        res.status(409).json({
          success: false,
          message: 'You are already an approved Scientist.',
        });
        return;
      }

      if (existingProfile.verificationStatus === ScientistVerificationStatus.PENDING) {
        res.status(409).json({
          success: false,
          message: 'You already have a pending scientist application under review.',
        });
        return;
      }

      // Re-submit if previously rejected
      existingProfile.fullName = trimmedFullName;
      existingProfile.institution = trimmedInstitution;
      existingProfile.designation = trimmedDesignation;
      existingProfile.researchArea = trimmedResearchArea;
      existingProfile.officialEmail = normalizedOfficialEmail;
      existingProfile.employeeOrScientistId = trimmedEmployeeId;
      existingProfile.idProofUrl = resolvedIdProofPublicId;
      existingProfile.idProofPublicId = resolvedIdProofPublicId;
      existingProfile.idProofResourceType = resolvedResourceType;
      existingProfile.idProofFormat = resolvedFormat;
      existingProfile.idProofDeliveryType = resolvedDeliveryType;
      existingProfile.bio = trimmedBio;
      existingProfile.verificationStatus = ScientistVerificationStatus.PENDING;
      existingProfile.rejectionReason = '';
      existingProfile.reviewedBy = null;
      existingProfile.reviewedAt = null;

      await existingProfile.save();

      res.status(200).json({
        success: true,
        message:
          'Scientist application re-submitted successfully. It is pending administrative verification.',
        application: {
          id: existingProfile._id.toString(),
          fullName: existingProfile.fullName,
          institution: existingProfile.institution,
          designation: existingProfile.designation,
          researchArea: existingProfile.researchArea,
          officialEmail: existingProfile.officialEmail,
          employeeOrScientistId: existingProfile.employeeOrScientistId,
          idProofPublicId: existingProfile.idProofPublicId,
          verificationStatus: existingProfile.verificationStatus,
          createdAt: existingProfile.createdAt,
        },
      });
      return;
    }

    // 4. Create new ScientistProfile (Note: User's role is NOT modified)
    const newProfile = await ScientistProfile.create({
      user: user._id,
      fullName: trimmedFullName,
      institution: trimmedInstitution,
      designation: trimmedDesignation,
      researchArea: trimmedResearchArea,
      officialEmail: normalizedOfficialEmail,
      employeeOrScientistId: trimmedEmployeeId,
      idProofUrl: resolvedIdProofPublicId,
      idProofPublicId: resolvedIdProofPublicId,
      idProofResourceType: resolvedResourceType,
      idProofFormat: resolvedFormat,
      idProofDeliveryType: resolvedDeliveryType,
      bio: trimmedBio,
      verificationStatus: ScientistVerificationStatus.PENDING,
    });

    res.status(201).json({
      success: true,
      message:
        'Scientist application submitted successfully. It is pending administrative verification.',
      application: {
        id: newProfile._id.toString(),
        fullName: newProfile.fullName,
        institution: newProfile.institution,
        designation: newProfile.designation,
        researchArea: newProfile.researchArea,
        officialEmail: newProfile.officialEmail,
        employeeOrScientistId: newProfile.employeeOrScientistId,
        idProofPublicId: newProfile.idProofPublicId,
        verificationStatus: newProfile.verificationStatus,
        createdAt: newProfile.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getScientistStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const profile = await ScientistProfile.findOne({ user: user._id });

    if (!profile) {
      res.status(200).json({
        success: true,
        hasApplied: false,
        status: null,
        application: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      hasApplied: true,
      status: profile.verificationStatus,
      application: {
        id: profile._id.toString(),
        fullName: profile.fullName,
        institution: profile.institution,
        designation: profile.designation,
        researchArea: profile.researchArea,
        officialEmail: profile.officialEmail,
        employeeOrScientistId: profile.employeeOrScientistId,
        idProofUrl: profile.idProofUrl,
        bio: profile.bio,
        verificationStatus: profile.verificationStatus,
        rejectionReason: profile.rejectionReason,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
