export enum UserRole {
  USER = 'USER',
  SCIENTIST = 'SCIENTIST',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserResponse {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}
