import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { Otp } from '../models/otp.model';
import { UserRole, AccountStatus } from '../types/user.types';
import { JWTPayload } from '../types/auth.types';
import { sendVerificationEmail } from '../services/email.service';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = 'polaris_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
      return;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    if (existingUser) {
      if (existingUser.emailVerified) {
        res.status(409).json({
          success: false,
          message: 'An account with this email is already registered and verified.',
        });
        return;
      }

      // Existing unverified account: update credentials and allow resending OTP
      existingUser.name = trimmedName;
      existingUser.password = hashedPassword;
      await existingUser.save();
    } else {
      // Create new user (strictly force role: USER)
      await User.create({
        name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: UserRole.USER,
        emailVerified: false,
        accountStatus: AccountStatus.ACTIVE,
      });
    }

    // 3. Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any prior OTPs for this email and save new OTP
    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    // 4. Send verification email via Nodemailer
    try {
      await sendVerificationEmail(normalizedEmail, otp, trimmedName);
    } catch (emailErr) {
      logger.error(
        `Failed to send email during registration to ${normalizedEmail}: ${
          emailErr instanceof Error ? emailErr.message : 'Unknown error'
        }`
      );
    }

    res.status(201).json({
      success: true,
      message: 'Verification code sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email and 6-digit verification code are required.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    // 1. Check user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'No account found with this email.',
      });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({
        success: false,
        message: 'Email is already verified.',
      });
      return;
    }

    // 2. Validate OTP
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: trimmedOtp,
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.',
      });
      return;
    }

    // 3. Update user emailVerified status
    user.emailVerified = true;
    await user.save();

    // 4. Delete used OTP
    await Otp.deleteMany({ email: normalizedEmail });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user by email, selecting password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !user.password) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // 2. Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // 3. Check emailVerified status
    if (!user.emailVerified) {
      res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in.',
      });
      return;
    }

    // 4. Check accountStatus
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.',
      });
      return;
    }

    // 5. Generate JWT token
    const payload: JWTPayload = {
      userId: user._id.toString(),
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '7d',
    });

    // 6. Set HTTP-only cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      maxAge: SEVEN_DAYS_MS,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    res.status(200).json({
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      emailVerified: req.user.emailVerified,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};
