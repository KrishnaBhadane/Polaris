import React from 'react';

interface PolarisWordmarkProps {
  className?: string;
  glow?: boolean;
}

export const PolarisWordmark: React.FC<PolarisWordmarkProps> = ({
  className = 'w-auto h-16 sm:h-24 md:h-32',
  glow = true,
}) => {
  return (
    <svg
      viewBox="0 0 1000 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className} ${glow ? 'filter drop-shadow-[0_4px_28px_rgba(56,189,248,0.4)]' : ''}`}
      aria-label="POLARIS"
    >
      <defs>
        {/* Ice Mountain Core Gradient */}
        <linearGradient id="icePeakGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.15" />
        </linearGradient>

        {/* Diagonal Crystal Shine Light Beam */}
        <linearGradient id="shineBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
          <stop offset="35%" stopColor="#7DD3FC" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="65%" stopColor="#BAE6FD" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>

        {/* Wordmark Mask for Seamless Interior Shine */}
        <mask id="wordmarkLettersMask">
          {/* P */}
          <path
            d="M 100 35 L 100 145 M 100 35 L 150 35 C 175 35 195 52 195 72 C 195 92 175 110 150 110 L 100 110"
            stroke="#FFFFFF"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* O */}
          <ellipse
            cx="290"
            cy="90"
            rx="52"
            ry="55"
            stroke="#FFFFFF"
            strokeWidth="15"
          />
          {/* L */}
          <path
            d="M 395 35 L 395 145 L 465 145"
            stroke="#FFFFFF"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* A */}
          <path
            d="M 485 145 L 535 35 L 585 145"
            stroke="#FFFFFF"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 508 108 L 562 108"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* R */}
          <path
            d="M 630 35 L 630 145 M 630 35 L 680 35 C 700 35 715 50 715 68 C 715 86 700 100 680 100 L 630 100 M 675 100 L 720 145"
            stroke="#FFFFFF"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* I */}
          <path
            d="M 770 35 L 770 145"
            stroke="#FFFFFF"
            strokeWidth="15"
            strokeLinecap="round"
          />
          {/* S */}
          <path
            d="M 890 55 C 880 42 865 35 845 35 C 825 35 810 46 810 62 C 810 80 830 87 855 93 C 880 99 900 108 900 126 C 900 142 882 152 860 152 C 838 152 820 142 810 128"
            stroke="#FFFFFF"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      {/* 1. Base Crisp Typography */}
      {/* P */}
      <path
        d="M 100 35 L 100 145 M 100 35 L 150 35 C 175 35 195 52 195 72 C 195 92 175 110 150 110 L 100 110"
        stroke="#FFFFFF"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* O */}
      <ellipse
        cx="290"
        cy="90"
        rx="52"
        ry="55"
        stroke="#FFFFFF"
        strokeWidth="15"
      />

      {/* L */}
      <path
        d="M 395 35 L 395 145 L 465 145"
        stroke="#FFFFFF"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* A - Signature Ice-Blue Mountain Peak & Sparkle Accent */}
      <g>
        {/* Triangular Peak Legs */}
        <path
          d="M 485 145 L 535 35 L 585 145"
          stroke="#7DD3FC"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ice-Blue Mountain Core Subtle Fill */}
        <polygon
          points="535,42 500,140 570,140"
          fill="url(#icePeakGradient)"
          opacity="0.3"
        />

        {/* Center Crossbar / Crystal Horizon */}
        <path
          d="M 508 108 L 562 108"
          stroke="#38BDF8"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* 4-Point Star / Sparkle Accent in Center of A */}
        <g transform="translate(535, 108)">
          <path
            d="M 0 -13 Q 0 0 13 0 Q 0 0 0 13 Q 0 0 -13 0 Q 0 0 0 -13 Z"
            fill="#FFFFFF"
          >
            <animate attributeName="opacity" values="0.75;1;0.75" dur="2.4s" repeatCount="indefinite" />
          </path>
          <circle cx="0" cy="0" r="2.5" fill="#E0F2FE" />
        </g>
      </g>

      {/* R */}
      <path
        d="M 630 35 L 630 145 M 630 35 L 680 35 C 700 35 715 50 715 68 C 715 86 700 100 680 100 L 630 100 M 675 100 L 720 145"
        stroke="#FFFFFF"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* I */}
      <path
        d="M 770 35 L 770 145"
        stroke="#FFFFFF"
        strokeWidth="15"
        strokeLinecap="round"
      />

      {/* S */}
      <path
        d="M 890 55 C 880 42 865 35 845 35 C 825 35 810 46 810 62 C 810 80 830 87 855 93 C 880 99 900 108 900 126 C 900 142 882 152 860 152 C 838 152 820 142 810 128"
        stroke="#FFFFFF"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Continuous Crystal Light Shine Beam Sweeping Across All Letters */}
      <g mask="url(#wordmarkLettersMask)" className="pointer-events-none">
        <rect x="-350" y="-20" width="320" height="220" fill="url(#shineBeamGradient)" transform="skewX(-24)">
          <animate
            attributeName="x"
            from="-400"
            to="1300"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </rect>
      </g>
    </svg>
  );
};

export default PolarisWordmark;
