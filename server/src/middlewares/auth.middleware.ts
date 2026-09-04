import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/user.model';
import { JWTPayload } from '../types/auth.types';
import { UserRole, AccountStatus } from '../types/user.types';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check cookies first
    if (req.cookies && req.cookies.polaris_token) {
      token = req.cookies.polaris_token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      // 2. Check Authorization header
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    // 3. Verify token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
      return;
    }

    // 4. Fetch user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: (UserRole | string)[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Access restricted to administrator accounts.',
      });
      return;
    }

    next();
  };
};
