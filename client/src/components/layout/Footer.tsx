import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-[#02050c] text-neutral-400 border-t border-white/[0.08] py-10 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
          {/* Brand Identity */}
          <div className="space-y-1.5 max-w-md">
            <Link
              to="/"
              className="inline-flex items-center space-x-2 text-white hover:text-sky-300 transition-colors group"
            >
              <svg className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              <span className="text-xs font-bold tracking-[0.25em] uppercase text-white">
                POLARIS
              </span>
            </Link>
            <p className="text-xs text-neutral-400 font-normal leading-relaxed">
              Integrated Polar Science Discovery & Outreach Platform. Empowering discovery across Antarctica, the Arctic, and the Himalayas.
            </p>
          </div>

          {/* Simple Navigation */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-300">
            <Link to="/explore" className="hover:text-white transition-colors">
              {t('nav.explore', 'Explore')}
            </Link>
            <Link to="/stations" className="hover:text-white transition-colors">
              {t('nav.stations', 'Stations')}
            </Link>
            <Link to="/expeditions" className="hover:text-white transition-colors">
              {t('nav.expeditions', 'Expeditions')}
            </Link>
            <Link to="/scientist/apply" className="text-sky-400 hover:text-sky-300 transition-colors">
              {t('nav.applyScientist', 'Apply as Scientist')}
            </Link>
            <a
              href="https://ncpor.res.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 hover:text-white transition-colors"
            >
              <span>NCPOR Portal</span>
              <ExternalLink className="w-3 h-3 text-neutral-500" />
            </a>
          </nav>
        </div>

        {/* Source Disclaimer & Copyright */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
            <span>
              Authoritative research records sourced from official NCPOR & MoES repositories.
            </span>
          </div>

          <p className="font-mono text-neutral-500">
            © {new Date().getFullYear()} POLARIS. Prototype Platform.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
