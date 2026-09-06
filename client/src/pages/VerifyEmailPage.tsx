import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { verifyEmailApi, resendOtpApi } from '../services/auth.service';
import polarisHeroBg from '../assets/polaris-hero-bg.png';

const RESEND_COOLDOWN = 60; // seconds — mirrors server-side cooldown

export const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds remaining
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queryParams = new URLSearchParams(location.search);
  const emailParam = queryParams.get('email');
  const registeredParam = queryParams.get('registered') === 'true';

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
      // Start cooldown on first load when coming fresh from registration
      if (registeredParam) {
        startCooldown(RESEND_COOLDOWN);
      }
    }
  }, [emailParam]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(seconds);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccess(null);

    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      setError('Please provide your email.');
      return;
    }

    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyEmailApi({ email: cleanEmail, otp: cleanOtp });

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || 'Verification failed. Code invalid.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Verification failed. Code may be expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address first.');
      return;
    }

    setResendLoading(true);
    setError(null);
    setResendSuccess(null);

    try {
      const res = await resendOtpApi(cleanEmail);
      if (res.success) {
        setResendSuccess('New verification code sent! Check your inbox.');
        setOtp('');
        startCooldown(res.retryAfterSeconds ?? RESEND_COOLDOWN);
      } else {
        // Server returned cooldown info
        if (res.retryAfterSeconds) {
          startCooldown(res.retryAfterSeconds);
        }
        setError(res.message || 'Could not resend code. Please try again.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      const retryAfter = err.response?.data?.retryAfterSeconds;
      if (retryAfter) startCooldown(retryAfter);
      setError(serverMsg || err.message || "Couldn't resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 overflow-hidden bg-[#02050c]">
      {/* Polar Map Background with soft blur & subtle overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={polarisHeroBg}
          alt="Antarctica Satellite Background"
          className="w-full h-full object-cover object-center filter blur-[5px] scale-105 opacity-80"
        />
        <div className="absolute inset-0 bg-[#02050c]/60 pointer-events-none" />
      </div>

      {/* Centered Minimal Auth Card */}
      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 bg-white/95 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl text-neutral-900 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Verify Email
          </h1>
          <p className="text-xs text-neutral-500">
            Enter the 6-digit numeric verification code
          </p>
        </div>

        {registeredParam && !success && (
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-start space-x-2">
            <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Code sent to <span className="font-semibold">{emailParam}</span>. Check your inbox.
            </span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Account Verified</h3>
              <p className="text-xs text-neutral-500">
                Your email is confirmed and your account is active.
              </p>
            </div>

            <button
              onClick={() =>
                navigate(`/login?verified=true&email=${encodeURIComponent(email.trim())}`)
              }
              className="ice-crystal-btn w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
            >
              <span>Sign In Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {resendSuccess && !error && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{resendSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scientist@polar.org"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white font-mono text-center tracking-[0.35em] text-base font-bold text-neutral-900 placeholder:text-neutral-300 placeholder:tracking-normal focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="ice-crystal-btn w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Verify & Activate</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <Link to="/login" className="hover:text-neutral-900">
                Back to Sign In
              </Link>

              {/* Resend OTP button with cooldown */}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
                className="flex items-center space-x-1 text-sky-600 hover:text-sky-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend OTP'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
