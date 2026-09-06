import dns from 'dns';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// ─── Environment flag ─────────────────────────────────────────────────────────
const isProduction = config.nodeEnv === 'production';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION: Brevo Transactional Email HTTPS API
// Render Free blocks outbound SMTP ports (25 / 465 / 587 are unreachable).
// Brevo's REST API communicates over HTTPS — no SMTP port required.
// ─────────────────────────────────────────────────────────────────────────────

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendViaBrevo(
  email: string,
  otp: string,
  recipientName: string
): Promise<void> {
  const payload = {
    sender: {
      name: config.brevoSenderName,
      email: config.brevoSenderEmail,
    },
    to: [{ email }],
    subject: 'POLARIS - Your Email Verification Code',
    textContent: buildTextBody(recipientName, otp),
    htmlContent: buildHtmlBody(recipientName, otp),
  };

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': config.brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err: unknown) {
    // Network-level failure (DNS, TCP, timeout)
    const msg = err instanceof Error ? err.message : 'network error';
    logger.error(`[Email] Brevo API network error (${Date.now() - t0}ms): ${msg}`);
    throw new Error("We couldn't send the verification code. Please try again.");
  }

  if (!res.ok) {
    // API-level error — log sanitized status, never expose key or body internals
    let sanitizedMessage = `HTTP ${res.status}`;
    try {
      const body = await res.json() as Record<string, unknown>;
      if (typeof body.message === 'string') sanitizedMessage += ` — ${body.message}`;
    } catch {
      // ignore parse errors
    }
    logger.error(`[Email] Brevo API error (${Date.now() - t0}ms): ${sanitizedMessage}`);
    throw new Error("We couldn't send the verification code. Please try again.");
  }

  logger.info(`[Auth Timing] email API send: ${Date.now() - t0}ms`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT: Gmail SMTP via Nodemailer
// Uses dns.resolve4 to force IPv4 in case the dev machine also has IPv6.
// ─────────────────────────────────────────────────────────────────────────────

const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const GMAIL_SMTP_PORT = 465;

// Prefer IPv4 for any other DNS lookups in this process
dns.setDefaultResultOrder('ipv4first');

function resolveGmailIpv4(): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.resolve4(GMAIL_SMTP_HOST, (err, addresses) => {
      if (err || !addresses?.length) {
        reject(err ?? new Error('dns.resolve4 returned no addresses'));
      } else {
        resolve(addresses[0]);
      }
    });
  });
}

let _smtpTransporter: Transporter | null = null;
let _resolvedSmtpIp: string | null = null;

async function getSmtpTransporter(): Promise<Transporter> {
  let currentIp: string;
  try {
    currentIp = await resolveGmailIpv4();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Email] Failed to resolve ${GMAIL_SMTP_HOST} IPv4: ${msg}`);
    throw new Error('Unable to resolve mail server address. Please try again.');
  }

  if (_smtpTransporter && currentIp === _resolvedSmtpIp) {
    return _smtpTransporter;
  }

  if (_resolvedSmtpIp && currentIp !== _resolvedSmtpIp) {
    logger.info(`[Email] Gmail SMTP IPv4 changed (${_resolvedSmtpIp} → ${currentIp}), recreating transporter.`);
  }

  _resolvedSmtpIp = currentIp;
  _smtpTransporter = nodemailer.createTransport({
    host: currentIp,
    port: GMAIL_SMTP_PORT,
    secure: true,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    auth: {
      user: config.emailUser,
      pass: config.emailAppPassword,
    },
    tls: {
      // Validate the cert against the correct hostname even though we connect by IP
      servername: GMAIL_SMTP_HOST,
    },
    connectionTimeout: 10_000,
    greetingTimeout:  10_000,
    socketTimeout:    15_000,
  });

  logger.info(`[Email] SMTP transporter created via IPv4 (${currentIp})`);
  return _smtpTransporter;
}

async function sendViaSmtp(
  email: string,
  otp: string,
  recipientName: string
): Promise<void> {
  const transporter = await getSmtpTransporter();

  const t0 = Date.now();
  try {
    await transporter.sendMail({
      from: `"POLARIS Platform" <${config.emailUser}>`,
      to: email,
      subject: 'POLARIS - Your Email Verification Code',
      text: buildTextBody(recipientName, otp),
      html: buildHtmlBody(recipientName, otp),
    });
    logger.info(`[Auth Timing] email send: ${Date.now() - t0}ms`);
  } catch (err: unknown) {
    const sanitized = err instanceof Error ? err.message : 'Unknown SMTP error';
    logger.error(`[Email] sendMail failed (${Date.now() - t0}ms): ${sanitized}`);
    // Invalidate transporter so next call rebuilds with a fresh IP
    _smtpTransporter = null;
    _resolvedSmtpIp = null;
    throw new Error("We couldn't send the verification code. Please try again.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared email body builders — existing POLARIS template, unchanged
// ─────────────────────────────────────────────────────────────────────────────

function buildTextBody(recipientName: string, otp: string): string {
  return (
    `Hello ${recipientName},\n\n` +
    `Your POLARIS verification code is: ${otp}\n\n` +
    `This code will expire in 10 minutes. If you did not request this, please ignore this email.\n\n` +
    `Best regards,\nPOLARIS Team`
  );
}

function buildHtmlBody(recipientName: string, otp: string): string {
  return `
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
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — controllers call this; provider is transparent to callers
// ─────────────────────────────────────────────────────────────────────────────

export const sendVerificationEmail = async (
  email: string,
  otp: string,
  name?: string
): Promise<void> => {
  const recipientName = name || 'User';

  if (isProduction) {
    // ── Production: Brevo HTTPS ───────────────────────────────────────────
    if (!config.brevoApiKey || !config.brevoSenderEmail) {
      logger.error('[Email] BREVO_API_KEY or BREVO_SENDER_EMAIL is missing. Cannot send OTP.');
      throw new Error('Email service is not configured on this server.');
    }
    await sendViaBrevo(email, otp, recipientName);
  } else {
    // ── Development: Gmail SMTP ───────────────────────────────────────────
    if (!config.emailUser || !config.emailAppPassword) {
      logger.warn('[Email] EMAIL_USER or EMAIL_APP_PASSWORD not set. Email dispatch skipped.');
      throw new Error('Email service is not configured on this server.');
    }
    await sendViaSmtp(email, otp, recipientName);
  }
};
