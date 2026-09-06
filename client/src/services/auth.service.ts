import { api } from './api';
import type { IUser } from '../types/auth.types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: IUser;
  retryAfterSeconds?: number;
}

export const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  return response.data;
};

export const registerApi = async (data: RegisterCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const verifyEmailApi = async (payload: VerifyEmailPayload): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/verify-email', payload);
  return response.data;
};

export const resendOtpApi = async (email: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/resend-otp', { email });
  return response.data;
};

export const getMeApi = async (): Promise<IUser> => {
  const response = await api.get<any>('/auth/me');
  const d = response.data;
  return (
    d.user || {
      _id: d.id || d._id,
      name: d.name,
      email: d.email,
      role: d.role,
      emailVerified: d.emailVerified,
      accountStatus: d.accountStatus || 'ACTIVE',
    }
  );
};

export const logoutApi = async (): Promise<void> => {
  await api.post('/auth/logout');
};

