import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Create Nodemailer Transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.emailUser,
      pass: config.emailAppPassword,
    },
  });
};

export const sendVerificationEmail = async (
  email: string,
  otp: string,
  name?: string
): Promise<void> => {
  if (!config.emailUser || !config.emailAppPassword) {
    logger.warn(
      'EMAIL_USER or EMAIL_APP_PASSWORD is not configured in .env. Email dispatch skipped.'
    );
    return;
  }

  const transporter = createTransporter();

  const recipientName = name ? name : 'User';

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

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to recipient: ${email}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email dispatch error';
    logger.error(`Failed to send verification email: ${errorMsg}`);
    throw new Error('Failed to send verification email. Please try again later.');
  }
};
