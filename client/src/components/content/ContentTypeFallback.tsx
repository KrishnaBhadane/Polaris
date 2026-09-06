import React from 'react';
import { Database, FileText, BookOpen, Film, Compass, Image as ImageIcon } from 'lucide-react';
import type { ContentType } from '../../types/content.types';

interface ContentTypeFallbackProps {
  type: ContentType;
  className?: string;
}

export const ContentTypeFallback: React.FC<ContentTypeFallbackProps> = ({
  type,
  className = '',
}) => {
  return (
    <div
      className={`w-full h-full relative flex flex-col items-center justify-center bg-[#060c18] overflow-hidden select-none ${className}`}
    >
      {/* Visual Canvas Pattern per Content Type */}
      {type === 'DATASET' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Minimal Grid & Waveform */}
          <svg
            className="w-full h-full opacity-25"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="30"
              x2="200"
              y2="30"
              stroke="#0ea5e9"
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
            <line
              x1="0"
              y1="60"
              x2="200"
              y2="60"
              stroke="#0ea5e9"
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
            <line
              x1="0"
              y1="90"
              x2="200"
              y2="90"
              stroke="#0ea5e9"
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="120"
              stroke="#0ea5e9"
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
            <line
              x1="100"
              y1="0"
              x2="100"
              y2="120"
              stroke="#0ea5e9"
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
            <line
              x1="150"
              y1="0"
              x2="150"
              y2="120"
              stroke="#0ea5e9"
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
            <path
              d="M0,60 L25,60 L35,45 L45,75 L55,30 L65,85 L75,55 L85,65 L100,60 L115,40 L125,78 L135,50 L145,70 L160,60 L200,60"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {type === 'REPORT' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Minimal Document / Paper Visual */}
          <svg
            className="w-full h-full opacity-20"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <rect
              x="65"
              y="15"
              width="70"
              height="90"
              rx="4"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1"
            />
            <line x1="75" y1="30" x2="105" y2="30" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="75" y1="42" x2="125" y2="42" stroke="#0ea5e9" strokeWidth="1" />
            <line x1="75" y1="52" x2="125" y2="52" stroke="#0ea5e9" strokeWidth="1" />
            <line x1="75" y1="62" x2="115" y2="62" stroke="#0ea5e9" strokeWidth="1" />
            <line x1="75" y1="72" x2="125" y2="72" stroke="#0ea5e9" strokeWidth="1" />
            <line x1="75" y1="82" x2="100" y2="82" stroke="#0ea5e9" strokeWidth="1" />
          </svg>
        </div>
      )}

      {type === 'PUBLICATION' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Minimal Research Paper / Monograph Visual */}
          <svg
            className="w-full h-full opacity-20"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <rect
              x="40"
              y="20"
              width="55"
              height="80"
              rx="3"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="0.8"
            />
            <rect
              x="105"
              y="20"
              width="55"
              height="80"
              rx="3"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="0.8"
            />
            <line x1="48" y1="32" x2="87" y2="32" stroke="#ffffff" strokeWidth="1" />
            <line x1="48" y1="42" x2="87" y2="42" stroke="#0ea5e9" strokeWidth="0.8" />
            <line x1="48" y1="52" x2="87" y2="52" stroke="#0ea5e9" strokeWidth="0.8" />
            <line x1="48" y1="62" x2="75" y2="62" stroke="#0ea5e9" strokeWidth="0.8" />
            <line x1="113" y1="32" x2="152" y2="32" stroke="#0ea5e9" strokeWidth="0.8" />
            <line x1="113" y1="42" x2="152" y2="42" stroke="#0ea5e9" strokeWidth="0.8" />
            <line x1="113" y1="52" x2="140" y2="52" stroke="#0ea5e9" strokeWidth="0.8" />
          </svg>
        </div>
      )}

      {type === 'VIDEO' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Minimal Video / Play-Frame Viewfinder */}
          <svg
            className="w-full h-full opacity-25"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <path d="M 35,32 L 35,22 L 45,22" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            <path
              d="M 165,32 L 165,22 L 155,22"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <path d="M 35,88 L 35,98 L 45,98" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            <path
              d="M 165,88 L 165,98 L 155,98"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <circle
              cx="100"
              cy="60"
              r="28"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
          </svg>
        </div>
      )}

      {type === 'ACTIVITY' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Minimal Expedition / Activity Marker Visual */}
          <svg
            className="w-full h-full opacity-20"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <line
              x1="100"
              y1="10"
              x2="100"
              y2="110"
              stroke="#0ea5e9"
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
            <line
              x1="20"
              y1="60"
              x2="180"
              y2="60"
              stroke="#0ea5e9"
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
            <circle cx="100" cy="60" r="20" fill="none" stroke="#0ea5e9" strokeWidth="0.8" />
            <circle
              cx="100"
              cy="60"
              r="42"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="0.6"
              strokeDasharray="3 4"
            />
          </svg>
        </div>
      )}

      {type === 'IMAGE' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Minimal Imagery Visual */}
          <svg
            className="w-full h-full opacity-20"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <rect
              x="45"
              y="22"
              width="110"
              height="76"
              rx="4"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
          </svg>
        </div>
      )}

      {/* Central Type Emblem & Micro-Label */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5">
        <div className="w-10 h-10 rounded-xl bg-[#0c1626] border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm">
          {type === 'DATASET' && <Database className="w-5 h-5 text-sky-400" />}
          {type === 'REPORT' && <FileText className="w-5 h-5 text-sky-400" />}
          {type === 'PUBLICATION' && <BookOpen className="w-5 h-5 text-sky-400" />}
          {type === 'VIDEO' && <Film className="w-5 h-5 text-sky-400" />}
          {type === 'ACTIVITY' && <Compass className="w-5 h-5 text-sky-400" />}
          {type === 'IMAGE' && <ImageIcon className="w-5 h-5 text-sky-400" />}
        </div>
        <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-300 font-medium">
          {type}
        </span>
      </div>
    </div>
  );
};

export default ContentTypeFallback;
