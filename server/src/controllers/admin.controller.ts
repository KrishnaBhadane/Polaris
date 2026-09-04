import { Request, Response, NextFunction } from 'express';
import { ScientistProfile } from '../models/scientistProfile.model';
import { User } from '../models/user.model';
import { ScientistVerificationStatus } from '../types/scientist.types';
import { UserRole } from '../types/user.types';

export const getPendingScientists = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pendingApplications = await ScientistProfile.find({
      verificationStatus: ScientistVerificationStatus.PENDING,
    })
      .populate('user', 'name email role accountStatus')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingApplications.length,
      data: pendingApplications,
    });
  } catch (error) {
    next(error);
  }
};

export const getScientistById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await ScientistProfile.findById(id)
      .populate('user', 'name email role emailVerified accountStatus')
      .populate('reviewedBy', 'name email role');

    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Scientist application not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const approveScientist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const application = await ScientistProfile.findById(id);

    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Scientist application not found.',
      });
      return;
    }

    if (application.verificationStatus !== ScientistVerificationStatus.PENDING) {
      res.status(409).json({
        success: false,
        message: `Application has already been reviewed with status: ${application.verificationStatus}`,
      });
      return;
    }

    // 1. Update application verification status
    application.verificationStatus = ScientistVerificationStatus.APPROVED;
    application.rejectionReason = '';
    application.reviewedBy = adminUser._id;
    application.reviewedAt = new Date();
    await application.save();

    // 2. Elevate user role to SCIENTIST
    await User.findByIdAndUpdate(application.user, {
      role: UserRole.SCIENTIST,
    });

    res.status(200).json({
      success: true,
      message: 'Scientist application approved successfully. User role updated to SCIENTIST.',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectScientist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = req.user;

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const application = await ScientistProfile.findById(id);

    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Scientist application not found.',
      });
      return;
    }

    if (application.verificationStatus !== ScientistVerificationStatus.PENDING) {
      res.status(409).json({
        success: false,
        message: `Application has already been reviewed with status: ${application.verificationStatus}`,
      });
      return;
    }

    const trimmedReason =
      typeof reason === 'string' && reason.trim().length > 0
        ? reason.trim()
        : 'Application did not meet scientific verification criteria.';

    // 1. Update application status to REJECTED
    application.verificationStatus = ScientistVerificationStatus.REJECTED;
    application.rejectionReason = trimmedReason;
    application.reviewedBy = adminUser._id;
    application.reviewedAt = new Date();
    await application.save();

    // Note: User role remains USER (unchanged)

    res.status(200).json({
      success: true,
      message: 'Scientist application rejected.',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};
