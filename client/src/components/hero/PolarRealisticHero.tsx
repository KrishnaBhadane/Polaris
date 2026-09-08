import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  Search,
  MapPin,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Menu,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LogOut,
  KeyRound,
  Shield,
  Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import polarisHeroBg from '../../assets/polaris-hero-bg.png';
import { useAuth } from '../../context/AuthContext';
import { loginApi, registerApi, verifyEmailApi } from '../../services/auth.service';
import { PolarisWordmark } from '../brand/PolarisWordmark';

interface Station {
  id: string;
  name: string;
  region: 'Antarctica' | 'Arctic';
  location: string;
  coordinates: string;
  description: string;
  posX: number;
  posY: number;
}

const STATIONS: Station[] = [
  {
    id: 'maitri',
    name: 'MAITRI STATION',
    region: 'Antarctica',
    location: 'Schirmacher Oasis, Queen Maud Land',
    coordinates: '70° 45′ S, 11° 43′ E',
    description: 'India’s permanent Antarctic station established in 1989 for atmospheric chemistry, meteorology, geomagnetic monitoring, and ice-sheet dynamics.',
    posX: 26,
    posY: 28,
  },
  {
    id: 'bharati',
    name: 'BHARATI STATION',
    region: 'Antarctica',
    location: 'Larsemann Hills, East Antarctica',
    coordinates: '69° 24′ S, 76° 11′ E',
    description: 'Operational since 2012, a high-tech polar laboratory facilitating oceanography, continental breakup studies, and cryospheric observation.',
    posX: 74,
    posY: 32,
  },
  {
    id: 'himadri',
    name: 'HIMADRI STATION',
    region: 'Arctic',
    location: 'Ny-Ålesund, Svalbard, Norway',
    coordinates: '78° 55′ N, 11° 56′ E',
    description: 'India’s Arctic research station investigating atmospheric aerosol profiling, fjord hydrology, and climate feedback mechanisms.',
    posX: 50,
    posY: 52,
  },
];

interface PolarRealisticHeroProps {
  onSearch?: (query: string) => void;
}

type AuthModalTab = 'LOGIN' | 'REGISTER' | 'VERIFY';

export const PolarRealisticHero: React.FC<PolarRealisticHeroProps> = ({ onSearch }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  const toggleLanguage = (lang: 'en' | 'hi') => {
    i18n.changeLanguage(lang);
  };

  const [activeStation, setActiveStation] = useState<Station | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // In-Page Auth State
  const [showAuthOverlay, setShowAuthOverlay] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<AuthModalTab>('LOGIN');

  // Auth Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  const { user, authenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authParam = params.get('auth');
    if (authParam === 'login' || params.get('login') === 'true') {
      openAuth('LOGIN');
    } else if (authParam === 'register') {
      openAuth('REGISTER');
    }
  }, [location.search]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (onSearch) {
      onSearch(query);
      scrollToSection('explore-section');
    } else {
      if (query) {
        navigate(`/explore?q=${encodeURIComponent(query)}`);
      } else {
        navigate('/explore');
      }
    }
  };

  const handleExploreStation = (station: Station) => {
    setActiveStation(null);
    navigate(`/stations?station=${station.id}`);
  };

  const openAuth = (tab: AuthModalTab = 'LOGIN') => {
    setAuthTab(tab);
    setAuthError(null);
    setAuthSuccessMsg(null);
    setShowAuthOverlay(true);
    setActiveStation(null);
  };

  const closeAuth = () => {
    setShowAuthOverlay(false);
    setAuthError(null);
    setAuthSuccessMsg(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (authTab === 'LOGIN') {
      if (!email.trim() || !password) {
        setAuthError('Please enter your email and password.');
        return;
      }
      try {
        setAuthLoading(true);
        const res = await loginApi({ email: email.trim(), password });
        if (res.success && res.user) {
          login(res.user);
          closeAuth();
          if (res.user.role === 'SCIENTIST') {
            navigate('/scientist/dashboard');
          } else if (res.user.role === 'ADMIN') {
            navigate('/admin/dashboard');
          }
        } else {
          setAuthError(res.message || 'Login failed.');
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Login failed.';
        setAuthError(msg);
        if (msg.toLowerCase().includes('verify your email')) {
          setAuthTab('VERIFY');
        }
      } finally {
        setAuthLoading(false);
      }
    } else if (authTab === 'REGISTER') {
      if (!name.trim()) {
        setAuthError('Please enter your name.');
        return;
      }
      if (!email.trim()) {
        setAuthError('Please enter your email.');
        return;
      }
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
      try {
        setAuthLoading(true);
        const res = await registerApi({ name: name.trim(), email: email.trim(), password });
        if (res.success) {
          setAuthSuccessMsg(`Account created! Enter the 6-digit code sent to ${email.trim()}`);
          setAuthTab('VERIFY');
        } else {
          setAuthError(res.message || 'Registration failed.');
        }
      } catch (err: any) {
        setAuthError(err.response?.data?.message || err.message || 'Registration failed.');
      } finally {
        setAuthLoading(false);
      }
    } else if (authTab === 'VERIFY') {
      if (!email.trim() || !otp.trim()) {
        setAuthError('Email and 6-digit code are required.');
        return;
      }
      try {
        setAuthLoading(true);
        const res = await verifyEmailApi({ email: email.trim(), otp: otp.trim() });
        if (res.success) {
          setAuthSuccessMsg('Email verified successfully! You can now sign in.');
          setAuthTab('LOGIN');
          setPassword('');
        } else {
          setAuthError(res.message || 'Verification failed.');
        }
      } catch (err: any) {
        setAuthError(err.response?.data?.message || err.message || 'Verification failed.');
      } finally {
        setAuthLoading(false);
      }
    }
  };

  return (
    <div
      id="hero-section"
      className="relative w-full min-h-[50vh] sm:min-h-screen bg-[#02050c] text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* 1. Photorealistic Antarctica Satellite Orbital Background with Smooth Blur Transition */}
      <div className="absolute inset-0 z-0 transition-all duration-700 ease-out">
        <img
          src={polarisHeroBg}
          alt="Antarctica Orbital Satellite View"
          className={`w-full h-full object-cover object-center sm:object-top transform sm:scale-105 transition-all duration-700 ease-out ${
            showAuthOverlay ? 'filter blur-[10px] opacity-60 scale-110' : 'opacity-95'
          }`}
        />
        {/* Soft edge blending */}
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            showAuthOverlay
              ? 'bg-[#02050c]/70 backdrop-blur-[4px]'
              : 'bg-gradient-to-b from-[#02050c]/80 via-transparent to-[#02050c]/90'
          } pointer-events-none`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#02050c_95%)] pointer-events-none" />
      </div>

      {/* 2. Floating Glass Pill Navigation Bar (Desktop & Tablet) */}
      <header className="relative z-40 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-3 sm:pt-5">
        <div className="hidden sm:flex items-center justify-between px-6 py-2.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {/* Brand Logo or Back to Map Button when in Auth mode */}
          {showAuthOverlay ? (
            <button
              onClick={closeAuth}
              className="flex items-center space-x-2 text-sky-400 hover:text-white transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase">
                {t('nav.homeHeroMap', 'BACK TO MAP')}
              </span>
            </button>
          ) : (
            <button
              onClick={scrollToTop}
              className="flex items-center space-x-2.5 text-white hover:text-sky-300 transition-colors group cursor-pointer"
            >
              <svg className="w-4 h-4 text-sky-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              <span className="text-xs font-bold tracking-[0.25em] uppercase text-white">
                {t('nav.brand', 'POLARIS')}
              </span>
            </button>
          )}

          {/* Navigation Links */}
          <nav className="flex items-center space-x-6">
            <button
              onClick={() => {
                if (showAuthOverlay) closeAuth();
                scrollToSection('explore-section');
              }}
              className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {t('nav.explore', 'Explore')}
            </button>

            {authenticated && user?.role === 'SCIENTIST' ? (
              <>
                <Link
                  to="/scientist/dashboard"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.dashboard', 'Dashboard')}
                </Link>
                <Link
                  to="/scientist/upload"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.upload', 'Upload')}
                </Link>
                <Link
                  to="/scientist/submissions"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.submissions', 'Submissions')}
                </Link>
                <Link
                  to="/outreach"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.outreach', 'Outreach')}
                </Link>
              </>
            ) : authenticated && user?.role === 'ADMIN' ? (
              <>
                <Link
                  to="/admin/dashboard"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.admin', 'Admin')}
                </Link>
                <Link
                  to="/admin/scientists"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.scientists', 'Scientists')}
                </Link>
                <Link
                  to="/admin/content"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.moderation', 'Moderation')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/stations"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.stations', 'Research Stations')}
                </Link>

                {authenticated && user?.role === 'USER' ? (
                  <Link
                    to="/scientist/apply"
                    className="text-xs font-medium tracking-wide text-sky-300 hover:text-white transition-colors"
                  >
                    {t('nav.applyScientist', 'Apply as Scientist')}
                  </Link>
                ) : !authenticated ? (
                  <button
                    onClick={() => {
                      if (showAuthOverlay) closeAuth();
                      scrollToSection('summary-section');
                    }}
                    className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {t('nav.summary', 'Summary')}
                  </button>
                ) : null}
              </>
            )}

            <span className="text-white/20">|</span>

            {/* Compact Language Selector (Desktop Hero) */}
            <div className="flex items-center space-x-1 text-[11px] font-medium bg-white/[0.08] px-2 py-0.5 rounded-full border border-white/10">
              <button
                onClick={() => toggleLanguage('en')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  currentLang === 'en'
                    ? 'text-white font-bold bg-white/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="English"
                aria-label="Switch language to English"
              >
                EN
              </button>
              <span className="text-white/20 select-none">|</span>
              <button
                onClick={() => toggleLanguage('hi')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  currentLang === 'hi'
                    ? 'text-white font-bold bg-white/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="हिंदी (Hindi)"
                aria-label="Switch language to Hindi"
              >
                हिंदी
              </button>
            </div>

            <span className="text-white/20">|</span>

            {/* Auth Action / User Profile */}
            {authenticated ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-neutral-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                  <UserIcon className="w-3 h-3 text-sky-400" />
                  <span className="max-w-[120px] truncate">{user?.name || user?.email}</span>
                  {user?.role === 'ADMIN' && (
                    <Shield className="w-3 h-3 text-sky-400 ml-1" />
                  )}
                  {user?.role === 'SCIENTIST' && (
                    <span className="text-[9px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded-full border border-sky-400/30">
                      {t('nav.roleScientist', 'SCIENTIST')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => logout()}
                  className="p-1 rounded-full text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                  title={t('nav.logout', 'Sign Out')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : showAuthOverlay ? (
              <button
                onClick={closeAuth}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Close Form"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => openAuth('LOGIN')}
                className="flex items-center space-x-1.5 px-3.5 py-1 text-xs font-medium text-white border border-white/30 hover:border-white bg-white/5 hover:bg-white/15 rounded-full transition-all cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-300" />
                <span>{t('nav.signIn', 'Login')}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Mobile Header Bar */}
        <div className="flex sm:hidden items-center justify-between px-3.5 py-2 rounded-full bg-black/85 backdrop-blur-xl border border-white/[0.15] shadow-lg">
          {showAuthOverlay ? (
            <button
              onClick={closeAuth}
              className="flex items-center space-x-1 text-sky-400 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('nav.homeHeroMap', 'MAP')}</span>
            </button>
          ) : (
            <button onClick={scrollToTop} className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-white">
                {t('nav.brand', 'POLARIS')}
              </span>
            </button>
          )}

          <div className="flex items-center space-x-2">
            {/* Mobile compact language toggle */}
            <div className="flex items-center space-x-0.5 text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded-full border border-white/15 text-white">
              <button
                onClick={() => toggleLanguage('en')}
                className={`px-1 cursor-pointer ${currentLang === 'en' ? 'text-sky-300 font-bold' : 'text-slate-400'}`}
              >
                EN
              </button>
              <span className="text-white/20">|</span>
              <button
                onClick={() => toggleLanguage('hi')}
                className={`px-1 cursor-pointer ${currentLang === 'hi' ? 'text-sky-300 font-bold' : 'text-slate-400'}`}
              >
                हिंदी
              </button>
            </div>

            {!authenticated && !showAuthOverlay && (
              <button
                onClick={() => openAuth('LOGIN')}
                className="px-2.5 py-0.5 text-[10px] font-bold text-black bg-white rounded-full"
              >
                {t('nav.signIn', 'LOGIN')}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded-full bg-white/10 text-white"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-2 p-3.5 rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/[0.15] space-y-2 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Language selection banner inside mobile menu */}
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-xs">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Language / भाषा</span>
              </span>
              <div className="flex items-center space-x-1.5 font-medium">
                <button
                  onClick={() => toggleLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    currentLang === 'en'
                      ? 'bg-sky-500 text-white font-bold'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => toggleLanguage('hi')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    currentLang === 'hi'
                      ? 'bg-sky-500 text-white font-bold'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                closeAuth();
                scrollToTop();
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-white/10 rounded-lg"
            >
              {t('nav.homeHeroMap', 'MAP OVERVIEW')}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                closeAuth();
                scrollToSection('explore-section');
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
            >
              {t('nav.exploreResearch', 'EXPLORE RESEARCH')}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                closeAuth();
                scrollToSection('summary-section');
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
            >
              {t('nav.summary', 'RESEARCH SUMMARY')}
            </button>
            {authenticated && user?.role === 'SCIENTIST' ? (
              <>
                <Link
                  to="/scientist/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.dashboard', 'SCIENTIST DASHBOARD')}
                </Link>
                <Link
                  to="/scientist/upload"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.uploadResearch', 'UPLOAD RESEARCH')}
                </Link>
                <Link
                  to="/scientist/submissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.mySubmissions', 'MY SUBMISSIONS')}
                </Link>
                <Link
                  to="/outreach"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.outreach', 'OUTREACH')}
                </Link>
              </>
            ) : authenticated && user?.role === 'ADMIN' ? (
              <>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.adminDashboard', 'ADMIN DASHBOARD')}
                </Link>
                <Link
                  to="/admin/scientists"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.scientistVerification', 'SCIENTIST VERIFICATION')}
                </Link>
                <Link
                  to="/admin/content"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.contentModeration', 'CONTENT MODERATION')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/stations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 rounded-lg"
                >
                  {t('nav.stations', 'RESEARCH STATIONS')}
                </Link>

                {authenticated && user?.role === 'USER' && (
                  <Link
                    to="/scientist/apply"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-white/10 rounded-lg"
                  >
                    {t('nav.applyScientist', 'APPLY AS SCIENTIST')}
                  </Link>
                )}
              </>
            )}

            {!authenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuth('LOGIN');
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-white/10 rounded-lg"
              >
                {t('nav.signIn', 'SIGN IN / REGISTER')}
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 rounded-lg"
              >
                {t('nav.logout', 'SIGN OUT')}
              </button>
            )}
          </div>
        )}

        {/* Integrated Clean Search Bar (Smoothly hides when Auth Overlay is open) */}
        <div
          className={`mt-2.5 max-w-xl mx-auto w-full transition-all duration-500 transform ${
            showAuthOverlay
              ? 'opacity-0 -translate-y-4 pointer-events-none max-h-0 overflow-hidden'
              : 'opacity-100 translate-y-0 max-h-20'
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="absolute left-3.5 sm:left-4 pointer-events-none text-neutral-400">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('hero.searchPlaceholder', 'Search polar studies, datasets, glaciers, climate models...')}
              className="w-full pl-10 sm:pl-11 pr-20 sm:pr-24 py-2 sm:py-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-[11px] sm:text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all shadow-xl"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 sm:px-4 py-1 sm:py-1.5 bg-white hover:bg-sky-100 text-black text-[10px] sm:text-xs font-semibold rounded-full transition-colors cursor-pointer"
            >
              {t('hero.searchButton', 'Search')}
            </button>
          </form>
        </div>
      </header>

      {/* 3. Central Typography OR Cinematic In-Page Auth Card */}
      {showAuthOverlay ? (
        /* Cinematic In-Page Auth Card */
        <div className="relative z-30 w-full max-w-md mx-auto px-4 my-auto py-6 animate-in fade-in zoom-in-95 duration-400">
          <div className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 sm:p-8 text-neutral-900 space-y-4">
            {/* Top Close & Tab Selector */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('LOGIN');
                    setAuthError(null);
                  }}
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    authTab === 'LOGIN'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('REGISTER');
                    setAuthError(null);
                  }}
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    authTab === 'REGISTER'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Register
                </button>
              </div>

              <button
                type="button"
                onClick={closeAuth}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Back to Hero"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success Alert */}
            {authSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* Error Alert */}
            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authTab === 'REGISTER' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Rajesh Sharma"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scientist@polar.org"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              {authTab !== 'VERIFY' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Password {authTab === 'REGISTER' && <span className="font-normal text-neutral-400">(min. 8 chars)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={authTab === 'REGISTER' ? 8 : undefined}
                      className="w-full pl-9 pr-9 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {authTab === 'REGISTER' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={8}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {authTab === 'VERIFY' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-center tracking-[0.35em] text-sm font-bold text-neutral-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="ice-crystal-btn w-full py-2.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : authTab === 'LOGIN' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </>
                  ) : authTab === 'REGISTER' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create Account</span>
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

            {/* Quick Toggle Helper */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              {authTab === 'LOGIN' ? (
                <>
                  <button
                    type="button"
                    onClick={() => openAuth('REGISTER')}
                    className="text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                  >
                    Create new account
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth('VERIFY')}
                    className="hover:text-neutral-800 cursor-pointer"
                  >
                    Enter OTP code
                  </button>
                </>
              ) : authTab === 'REGISTER' ? (
                <button
                  type="button"
                  onClick={() => openAuth('LOGIN')}
                  className="text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                >
                  Already registered? Sign In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth('LOGIN')}
                  className="text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                >
                  Back to Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Central Brand Wordmark with continuous crystal shine animation */
        <div className="relative z-20 text-center px-4 my-auto pt-2 sm:pt-6 pointer-events-none flex items-center justify-center w-full max-w-4xl mx-auto transition-all duration-500">
          <PolarisWordmark className="w-full max-w-[280px] sm:max-w-lg md:max-w-xl lg:max-w-2xl h-auto" />
        </div>
      )}

      {/* 4. Interactive High-Precision Station Markers (Hides when Auth Overlay is open) */}
      <div
        className={`relative z-30 w-full max-w-6xl mx-auto h-[180px] sm:h-[320px] px-4 pointer-events-none transition-all duration-500 ${
          showAuthOverlay ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'
        }`}
      >
        {STATIONS.map((station) => {
          const isActive = activeStation?.id === station.id;
          const isHovered = hoveredStation === station.id;

          return (
            <div
              key={station.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-all duration-300"
              style={{
                left: `${station.posX}%`,
                top: `${station.posY}%`,
              }}
            >
              {/* Pin Trigger Button */}
              <button
                type="button"
                onClick={() => setActiveStation(isActive ? null : station)}
                onMouseEnter={() => setHoveredStation(station.id)}
                onMouseLeave={() => setHoveredStation(null)}
                className="group relative flex items-center cursor-pointer focus:outline-none"
                aria-label={`Open ${station.name}`}
              >
                {/* Surface Luminous Ripple */}
                <span className="absolute w-12 h-6 -bottom-1 rounded-full bg-sky-400/25 blur-md animate-pulse pointer-events-none" />
                <span className="absolute w-8 h-8 sm:w-10 sm:h-10 -top-1 rounded-full bg-sky-400/30 animate-ping pointer-events-none" />

                <div className="relative flex items-center">
                  {/* Pin Circle */}
                  <div
                    className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center shadow-2xl shrink-0 ${
                      isActive
                        ? 'border-white bg-sky-500 scale-110 shadow-[0_0_20px_rgba(56,189,248,1)]'
                        : isHovered
                        ? 'border-white bg-sky-500/60 scale-105 shadow-[0_0_15px_rgba(56,189,248,0.8)]'
                        : 'border-sky-300 bg-[#071328]/90'
                    }`}
                  >
                    <MapPin
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                        isActive ? 'text-white' : 'text-sky-200 group-hover:text-white'
                      }`}
                    />
                  </div>

                  {/* Station Badge Label */}
                  <div
                    className={`hidden sm:block ml-2 px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-all duration-200 whitespace-nowrap shadow-2xl border ${
                      isActive
                        ? 'bg-white text-black border-white scale-105'
                        : 'bg-black/80 backdrop-blur-md text-white border-white/20 group-hover:border-sky-400/60 group-hover:bg-black/90'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>{station.name}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-300 font-normal mt-0.5">
                      {station.coordinates}
                    </div>
                  </div>
                </div>
              </button>

              {/* Station Info Popover */}
              {isActive && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 sm:mb-3 w-60 sm:w-80 p-3.5 sm:p-4 bg-white text-black rounded-2xl shadow-2xl border border-neutral-200 z-50 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-start justify-between pb-1.5 sm:pb-2 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                          {station.name}
                        </h3>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-neutral-500 block mt-0.5">
                        {station.location} &bull; {station.coordinates}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveStation(null)}
                      className="p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-neutral-600 leading-relaxed py-2">
                    {station.description}
                  </p>

                  <button
                    onClick={() => handleExploreStation(station)}
                    className="w-full flex items-center justify-center space-x-2 py-1.5 sm:py-2 px-3 bg-black hover:bg-neutral-800 text-white text-[11px] sm:text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <span>{t('hero.exploreStationResearch', 'Explore Research')}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Mobile Station Quick Selector */}
      {!showAuthOverlay && (
        <div className="sm:hidden relative z-30 px-3 pb-2">
          <div className="grid grid-cols-3 gap-1.5">
            {STATIONS.map((station) => (
              <button
                key={station.id}
                onClick={() => setActiveStation(activeStation?.id === station.id ? null : station)}
                className={`py-1.5 px-1 rounded-lg text-center border transition-all ${
                  activeStation?.id === station.id
                    ? 'bg-sky-500 text-white border-white'
                    : 'bg-black/70 text-slate-200 border-white/20'
                }`}
              >
                <div className="text-[9px] font-bold truncate">{station.name.split(' ')[0]}</div>
                <div className="text-[8px] font-mono opacity-80">{station.coordinates.split(',')[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Minimal Scroll Indicator */}
      {!showAuthOverlay && (
        <button
          onClick={() => scrollToSection('explore-section')}
          className="hidden sm:flex relative z-20 pb-4 text-center flex-col items-center justify-center hover:opacity-100 opacity-80 transition-opacity cursor-pointer mx-auto focus:outline-none"
        >
          <div className="inline-flex flex-col items-center space-y-1 text-slate-400">
            <div className="w-4 h-7 rounded-full border border-white/30 flex items-start justify-center p-1">
              <span className="w-1 h-1.5 rounded-full bg-sky-400 animate-bounce" />
            </div>
            <span className="text-[9px] tracking-[0.25em] uppercase font-medium text-slate-300">
              {t('hero.scrollToExplore', 'SCROLL TO EXPLORE')}
            </span>
            <ChevronDown className="w-3 h-3 text-sky-400 animate-pulse" />
          </div>
        </button>
      )}
    </div>
  );
};

export default PolarRealisticHero;
