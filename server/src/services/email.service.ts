import dns from 'dns';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// ─── IPv4 DNS resolution ─────────────────────────────────────────────────────
// Render's network cannot reach Gmail over IPv6 (ENETUNREACH on IPv6 routes).
// We resolve smtp.gmail.com using dns.resolve4() which returns A records only
// (IPv4), then pass the resolved address as `host` so Nodemailer never
// attempts an IPv6 connection. TLS servername is preserved so cert validation
// works correctly against smtp.gmail.com even though we connect by IP.

const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const GMAIL_SMTP_PORT = 465;

// Node's default resolver prefers IPv6 (AAAA) when both exist. Set ipv4first
// as an additional safety net for any other DNS lookups in this process.
dns.setDefaultResultOrder('ipv4first');

/** Resolve smtp.gmail.com → first IPv4 address (A record). */
async function resolveGmailIpv4(): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.resolve4(GMAIL_SMTP_HOST, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        reject(err ?? new Error('dns.resolve4 returned no addresses'));
      } else {
        resolve(addresses[0]);
      }
    });
  });
}

// ─── Singleton transporter ───────────────────────────────────────────────────
// Rebuilt whenever the resolved IPv4 address changes (DNS TTL drift).
let _transporter: Transporter | null = null;
let _resolvedIp: string | null = null;

async function getTransporter(): Promise<Transporter> {
  // Re-resolve every call (result is fast from OS DNS cache).
  // Recreate transporter only when the IP actually changes.
  let currentIp: string;
  try {
    currentIp = await resolveGmailIpv4();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Email] Failed to resolve ${GMAIL_SMTP_HOST} IPv4: ${msg}`);
    throw new Error('Unable to resolve mail server address. Please try again.');
  }

  if (_transporter && currentIp === _resolvedIp) {
    return _transporter;
  }

  // IP changed (or first call) — rebuild transporter.
  if (_resolvedIp && currentIp !== _resolvedIp) {
    logger.info(`[Email] Gmail SMTP IPv4 changed (${_resolvedIp} → ${currentIp}), recreating transporter.`);
  }

  _resolvedIp = currentIp;
  _transporter = nodemailer.createTransport({
    // Explicit host bypasses Nodemailer's own DNS lookup (which could pick IPv6).
    host: currentIp,
    port: GMAIL_SMTP_PORT,
    secure: true,               // TLS on port 465
    pool: true,                 // Reuse SMTP connections
    maxConnections: 2,
    maxMessages: 50,
    auth: {
      user: config.emailUser,
      pass: config.emailAppPassword,
    },
    tls: {
      // Required when connecting by IP: tells Node TLS which hostname to
      // validate the server certificate against.
      servername: GMAIL_SMTP_HOST,
      // DO NOT set rejectUnauthorized: false — full cert validation is kept.
    },
    // Timeout guards — prevents silent hangs on Render
    connectionTimeout: 10_000,  // 10 s to establish TCP connection
    greetingTimeout:  10_000,   // 10 s for SMTP EHLO greeting
    socketTimeout:    15_000,   // 15 s of inactivity on an open socket
  });

  logger.info(`[Email] Transporter created using Gmail SMTP via IPv4 (${currentIp})`);
  return _transporter;
}

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

  const transporter = await getTransporter();
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
    // Invalidate transporter so next call rebuilds with a fresh IP resolution
    _transporter = null;
    _resolvedIp = null;
    // Re-throw a clean user-facing error
    throw new Error("We couldn't send the verification code. Please try again.");
  }
};
