import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authenticated, logout } = useAuth();

  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  const toggleLanguage = (lang: 'en' | 'hi') => {
    i18n.changeLanguage(lang);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isContentDetail = location.pathname.startsWith('/content');

  const scrollToRelated = () => {
    const el = document.getElementById('related-research');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-3 sm:pt-4 pb-2 transition-all">
      {/* Desktop & Tablet Floating Pill Bar */}
      <div className="hidden sm:flex items-center justify-between px-6 py-2.5 rounded-full bg-black border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center space-x-2.5 text-white hover:text-sky-300 transition-colors group cursor-pointer"
        >
          <svg className="w-4 h-4 text-sky-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L12 22L9.5 9.5L12 2Z" />
          </svg>
          <span className="text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-white">
            {t('nav.brand', 'POLARIS')}
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="flex items-center space-x-5 lg:space-x-6">
          <Link
            to="/explore"
            className={`text-xs font-medium tracking-wide transition-colors ${
              isActive('/explore')
                ? 'text-sky-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('nav.explore', 'Explore')}
          </Link>

          {/* Role-Specific Navigation */}
          {authenticated && user?.role === 'SCIENTIST' ? (
            <>
              <Link
                to="/scientist/dashboard"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/scientist/dashboard')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.dashboard', 'Dashboard')}
              </Link>
              <Link
                to="/scientist/upload"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/scientist/upload')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.upload', 'Upload')}
              </Link>
              <Link
                to="/scientist/submissions"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/scientist/submissions')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.submissions', 'Submissions')}
              </Link>
            </>
          ) : authenticated && user?.role === 'ADMIN' ? (
            <>
              <Link
                to="/admin/dashboard"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/admin/dashboard')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.admin', 'Admin')}
              </Link>
              <Link
                to="/admin/scientists"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/admin/scientists')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.scientists', 'Scientists')}
              </Link>
              <Link
                to="/admin/content"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/admin/content')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.moderation', 'Moderation')}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/stations"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/stations')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.stations', 'Research Stations')}
              </Link>

              <Link
                to="/expeditions"
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isActive('/expeditions')
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('nav.expeditions', 'Expeditions')}
              </Link>

              {authenticated && user?.role === 'USER' && (
                <Link
                  to="/scientist/apply"
                  className={`text-xs font-medium tracking-wide transition-colors ${
                    isActive('/scientist/apply')
                      ? 'text-sky-400 font-semibold'
                      : 'text-sky-300 hover:text-white'
                  }`}
                >
                  {t('nav.applyScientist', 'Apply as Scientist')}
                </Link>
              )}

              {isContentDetail ? (
                <button
                  onClick={scrollToRelated}
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {t('nav.similarContent', 'Similar Content')}
                </button>
              ) : !authenticated ? (
                <Link
                  to="/#summary-section"
                  className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.summary', 'Summary')}
                </Link>
              ) : null}
            </>
          )}

          <span className="text-white/20">|</span>

          {/* Compact Language Selector (Desktop) */}
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

          {/* User Auth or Home Button */}
          {authenticated ? (
            <div className="flex items-center space-x-2.5">
              <div className="hidden sm:flex items-center space-x-1.5 text-[11px] font-mono text-neutral-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                <span className="max-w-[110px] truncate">{user?.name || user?.email}</span>
                {user?.role === 'SCIENTIST' && (
                  <span className="text-[9px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded-full border border-sky-400/30">
                    {t('nav.roleScientist', 'SCIENTIST')}
                  </span>
                )}
                {user?.role === 'ADMIN' && (
                  <span className="text-[9px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded-full border border-sky-400/30">
                    {t('nav.roleAdmin', 'ADMIN')}
                  </span>
                )}
              </div>
              <Link
                to="/"
                className="px-3 py-1 text-xs font-medium text-white border border-white/20 hover:border-white bg-white/5 hover:bg-white/15 rounded-full transition-all flex items-center space-x-1"
                title="Home Hero Map"
              >
                <Home className="w-3 h-3 text-slate-300" />
                <span>{t('nav.home', 'Home')}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1 rounded-full text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/"
                className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-white border border-white/20 hover:border-white bg-white/5 hover:bg-white/15 rounded-full transition-all cursor-pointer"
              >
                <Home className="w-3 h-3 text-slate-300" />
                <span>{t('nav.home', 'Home')}</span>
              </Link>
              <Link
                to="/?auth=login"
                className="px-3 py-1 text-xs font-semibold text-black bg-white hover:bg-slate-100 rounded-full transition-all"
              >
                {t('nav.signIn', 'Sign In')}
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Mobile Header Bar */}
      <div className="flex sm:hidden items-center justify-between px-3.5 py-2 rounded-full bg-black border border-white/[0.15] shadow-lg">
        <Link
          to="/"
          className="flex items-center space-x-2 text-white hover:text-sky-300 transition-colors"
        >
          <svg className="w-4 h-4 text-sky-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-white">
            {t('nav.brand', 'POLARIS')}
          </span>
        </Link>

        <div className="flex items-center space-x-2">
          {/* Mobile compact language toggle */}
          <div className="flex items-center space-x-0.5 text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded-full border border-white/15 text-white">
            <button
              onClick={() => toggleLanguage('en')}
              className={`px-1 ${currentLang === 'en' ? 'text-sky-300 font-bold' : 'text-slate-400'}`}
            >
              EN
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => toggleLanguage('hi')}
              className={`px-1 ${currentLang === 'hi' ? 'text-sky-300 font-bold' : 'text-slate-400'}`}
            >
              हिंदी
            </button>
          </div>

          <Link
            to="/"
            className="px-2.5 py-0.5 text-[10px] font-bold text-black bg-white rounded-full transition-colors flex items-center space-x-1"
          >
            <Home className="w-3 h-3 text-black" />
            <span>{t('nav.home', 'HOME').toUpperCase()}</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden mt-2 p-3.5 rounded-2xl bg-[#0a0a0a] border border-white/15 space-y-2 shadow-2xl text-white animate-in fade-in zoom-in-95">
          {/* Language selection banner inside mobile menu */}
          <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-xs">
            <span className="flex items-center space-x-1.5 text-slate-300">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Language / भाषा</span>
            </span>
            <div className="flex items-center space-x-1.5 font-medium">
              <button
                onClick={() => toggleLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  currentLang === 'en'
                    ? 'bg-sky-500 text-white font-bold'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                English
              </button>
              <button
                onClick={() => toggleLanguage('hi')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  currentLang === 'hi'
                    ? 'bg-sky-500 text-white font-bold'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-sky-300 bg-white/10 rounded-xl"
          >
            <Home className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('nav.homeHeroMap', 'HOME / HERO MAP')}</span>
          </Link>

          <Link
            to="/explore"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isActive('/explore')
                ? 'text-sky-400 bg-white/10 font-semibold'
                : 'text-slate-200 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('nav.exploreResearch', 'EXPLORE RESEARCH')}
          </Link>

          {authenticated && user?.role === 'SCIENTIST' ? (
            <>
              <Link
                to="/scientist/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {t('nav.dashboard', 'DASHBOARD')}
              </Link>
              <Link
                to="/scientist/upload"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {t('nav.uploadResearch', 'UPLOAD RESEARCH')}
              </Link>
              <Link
                to="/scientist/submissions"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {t('nav.mySubmissions', 'MY SUBMISSIONS')}
              </Link>
            </>
          ) : authenticated && user?.role === 'ADMIN' ? (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {t('nav.adminDashboard', 'ADMIN DASHBOARD')}
              </Link>
              <Link
                to="/admin/scientists"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {t('nav.scientistVerification', 'SCIENTIST VERIFICATION')}
              </Link>
              <Link
                to="/admin/content"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {t('nav.contentModeration', 'CONTENT MODERATION')}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/stations"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive('/stations')
                    ? 'text-sky-400 bg-white/10 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('nav.stations', 'RESEARCH STATIONS').toUpperCase()}
              </Link>

              <Link
                to="/expeditions"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive('/expeditions')
                    ? 'text-sky-400 bg-white/10 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('nav.expeditions', 'EXPEDITIONS').toUpperCase()}
              </Link>

              {authenticated && user?.role === 'USER' && (
                <Link
                  to="/scientist/apply"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-white/5 rounded-lg"
                >
                  {t('nav.applyScientist', 'APPLY AS SCIENTIST').toUpperCase()}
                </Link>
              )}
            </>
          )}

          {isContentDetail && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToRelated();
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
            >
              {t('nav.similarContent', 'SIMILAR CONTENT').toUpperCase()}
            </button>
          )}

          {authenticated ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
            >
              {t('nav.logout', 'LOGOUT').toUpperCase()}
            </button>
          ) : (
            <Link
              to="/?auth=login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg text-center"
            >
              {t('nav.signIn', 'SIGN IN').toUpperCase()}
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
