export type UserRole = 'USER' | 'SCIENTIST' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: IUser | null;
  authenticated: boolean;
  loading: boolean;
  login: (userData: IUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
