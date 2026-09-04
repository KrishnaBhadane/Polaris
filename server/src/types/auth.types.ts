import { UserRole } from './user.types';
import { IUserDocument } from '../models/user.model';

export interface JWTPayload {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}
