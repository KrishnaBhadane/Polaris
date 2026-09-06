import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../services/auth.service';
import polarisHeroBg from '../assets/polaris-hero-bg.png';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const isVerifiedParam = queryParams.get('verified') === 'true';
  const emailParam = queryParams.get('email');

  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await loginApi({ email: email.trim(), password });
      if (res.success && res.user) {
        login(res.user);
        const fromState = (location.state as any)?.from?.pathname;
        if (res.user.role === 'SCIENTIST') {
          navigate(fromState && fromState.startsWith('/scientist') ? fromState : '/scientist/dashboard', { replace: true });
        } else if (res.user.role === 'ADMIN') {
          navigate(fromState && fromState.startsWith('/admin') ? fromState : '/admin/dashboard', { replace: true });
        } else {
          navigate(fromState || '/explore', { replace: true });
        }
      } else {
        setError(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Unable to log in. Please check credentials.';
      setError(msg);
      if (msg.toLowerCase().includes('verify your email')) {
        setIsUnverified(true);
      }
    } finally {
      setLoading(false);
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
            Sign In
          </h1>
          <p className="text-xs text-neutral-500">
            Enter your POLARIS research credentials
          </p>
        </div>

        {/* Verified Notice */}
        {isVerifiedParam && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Email verified! You can now sign in.</span>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex flex-col space-y-1">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {isUnverified && (
              <Link
                to={`/verify-email?email=${encodeURIComponent(email)}`}
                className="pl-6 text-xs font-semibold text-sky-600 hover:text-sky-700 underline"
              >
                Verify email now →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="ice-crystal-btn w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <div>
            New user?{' '}
            <Link to="/register" className="text-sky-600 hover:text-sky-700 font-semibold">
              Create account
            </Link>
          </div>
          <Link to="/verify-email" className="hover:text-neutral-800">
            Verify OTP
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
