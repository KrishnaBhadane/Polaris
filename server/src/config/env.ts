import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

/**
 * Resolve JWT secret with strict production enforcement.
 * PRODUCTION: JWT_SECRET is mandatory — throws if missing.
 * DEVELOPMENT: Uses a per-process random fallback with a log warning.
 */
const resolveJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length > 0) return secret;

  if (isProduction) {
    throw new Error(
      '[FATAL] JWT_SECRET is not set. This is REQUIRED in production. ' +
        'Set JWT_SECRET in your environment variables or .env file.'
    );
  }

  // Development only: temporary per-process secret (invalidated on restart)
  console.warn('[WARN] Using temporary development JWT secret. Set JWT_SECRET in .env for persistent sessions.');
  return crypto.randomBytes(64).toString('hex');
};

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  // Development email (Nodemailer / Gmail SMTP)
  emailUser: process.env.EMAIL_USER || '',
  emailAppPassword: process.env.EMAIL_APP_PASSWORD || '',
  // Production email (Resend HTTPS API)
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
  jwtSecret: resolveJwtSecret(),
  adminName: process.env.ADMIN_NAME || 'POLARIS Administrator',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiFastModel: process.env.GEMINI_FAST_MODEL || 'gemini-3.5-flash-lite',
  geminiStrongModel: process.env.GEMINI_STRONG_MODEL || 'gemini-3.5-flash',
};

/**
 * Validates that all required environment variables are set for production.
 * Called once at startup in server.ts, before DB connection.
 * Collects ALL missing vars before throwing so operators can fix everything at once.
 */
export function validateProductionEnv(): void {
  if (!isProduction) return;

  const missing: string[] = [];

  if (!config.mongoUri) missing.push('MONGODB_URI');
  // JWT_SECRET already enforced by resolveJwtSecret() above, but double-check
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET');
  if (!config.corsOrigin) missing.push('CORS_ORIGIN');
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY');
  if (!config.cloudinaryCloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!config.cloudinaryApiKey) missing.push('CLOUDINARY_API_KEY');
  if (!config.cloudinaryApiSecret) missing.push('CLOUDINARY_API_SECRET');

  // Production uses Resend HTTPS API — Gmail SMTP credentials are NOT required in production.
  if (!config.resendApiKey) missing.push('RESEND_API_KEY (required for production OTP email delivery)');
  if (!config.emailFrom) missing.push('EMAIL_FROM (required for production OTP email sender address)');

  if (missing.length > 0) {
    throw new Error(
      `[FATAL] Missing required production environment variables:\n` +
        missing.map((v) => `  - ${v}`).join('\n') +
        `\nSet these in your .env or host environment before starting in production.`
    );
  }

  console.log('[ENV] All required production environment variables verified.');
}
