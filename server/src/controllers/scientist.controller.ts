import { Request, Response, NextFunction } from 'express';
import { ScientistProfile } from '../models/scientistProfile.model';
import { ScientistVerificationStatus } from '../types/scientist.types';
import { AccountStatus } from '../types/user.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    if (!idProofUrl || typeof idProofUrl !== 'string' || idProofUrl.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'ID proof URL or reference is required.',
      });
      return;
    }

    const trimmedFullName = fullName.trim();
    const trimmedInstitution = institution.trim();
    const trimmedDesignation = designation.trim();
    const trimmedResearchArea = researchArea.trim();
    const normalizedOfficialEmail = officialEmail.trim().toLowerCase();
    const trimmedEmployeeId = employeeOrScientistId.trim();
    const trimmedIdProofUrl = idProofUrl.trim();
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
      existingProfile.idProofUrl = trimmedIdProofUrl;
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
          idProofUrl: existingProfile.idProofUrl,
          bio: existingProfile.bio,
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
      idProofUrl: trimmedIdProofUrl,
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
        idProofUrl: newProfile.idProofUrl,
        bio: newProfile.bio,
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
