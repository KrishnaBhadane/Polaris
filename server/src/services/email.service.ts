import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// ─── Singleton transporter ───────────────────────────────────────────────────
// Created once at module load; reused for every email.
// Pool keeps connections alive so we don't pay TCP + TLS handshake per send.
let _transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,          // reuse SMTP connections
      maxConnections: 2,
      maxMessages: 50,
      auth: {
        user: config.emailUser,
        pass: config.emailAppPassword,
      },
      // Timeout guards — prevents silent hangs on Render
      connectionTimeout: 10_000,   // 10 s to establish TCP connection
      greetingTimeout:  10_000,    // 10 s for SMTP EHLO greeting
      socketTimeout:    15_000,    // 15 s of inactivity on an open socket
    });
  }
  return _transporter;
};

// ─── sendVerificationEmail ───────────────────────────────────────────────────
// Throws on failure — callers must handle and surface the error appropriately.
export const sendVerificationEmail = async (
  email: string,
  otp: string,
  name?: string
): Promise<void> => {
  if (!config.emailUser || !config.emailAppPassword) {
    logger.warn(
      'EMAIL_USER or EMAIL_APP_PASSWORD is not configured. Email dispatch skipped.'
    );
    // In production this would be caught by validateProductionEnv(); still
    // throw so the caller knows the email was NOT sent.
    throw new Error('Email service is not configured on this server.');
  }

  const transporter = getTransporter();
  const recipientName = name || 'User';

  const mailOptions = {
    from: `"POLARIS Platform" <${config.emailUser}>`,
    to: email,
    subject: 'POLARIS - Your Email Verification Code',
    text: `Hello ${recipientName},\n\nYour POLARIS verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nPOLARIS Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #818cf8; margin: 0; font-size: 24px; letter-spacing: 2px;">POLARIS</h2>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Email Verification</p>
        </div>
        
        <p style="font-size: 16px; line-height: 24px; color: #e2e8f0;">Hello <strong>${recipientName}</strong>,</p>
        <p style="font-size: 14px; line-height: 22px; color: #cbd5e1;">Thank you for registering on POLARIS. Please use the verification code below to verify your email address:</p>
        
        <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #38bdf8;">${otp}</span>
        </div>
        
        <p style="font-size: 13px; color: #94a3b8; line-height: 20px;">This code will expire in <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
        
        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} POLARIS. All rights reserved.</p>
      </div>
    `,
  };

  const t0 = Date.now();
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`[Auth Timing] email send: ${Date.now() - t0}ms — recipient verified`);
  } catch (err: unknown) {
    // Log sanitized error internally; never expose credentials or internals.
    const sanitized = err instanceof Error ? err.message : 'Unknown SMTP error';
    logger.error(`[Email] sendMail failed (${Date.now() - t0}ms): ${sanitized}`);
    // Re-throw a clean user-facing error
    throw new Error('We couldn\'t send the verification code. Please try again.');
  }
};
