import React from 'react';

interface MayaButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const MayaButton: React.FC<MayaButtonProps> = ({ isOpen, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close Maya' : 'Open Maya'}
      aria-expanded={isOpen}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#98AAB5] focus:ring-offset-2 active:scale-95"
      style={{
        background: isOpen
          ? 'linear-gradient(145deg, #E8EEF2 0%, #CBD7DE 100%)'
          : 'linear-gradient(145deg, #F0F4F6 0%, #DDE5EA 55%, #CBD7DE 100%)',
        border: '1px solid #B0C2CC',
        boxShadow: isOpen
          ? '0 2px 10px rgba(98,118,129,0.18), inset 0 1px 0 rgba(255,255,255,0.7)'
          : '0 4px 16px rgba(98,118,129,0.22), 0 1px 4px rgba(0,0,0,0.08), inset 0 1.5px 0 rgba(255,255,255,0.85)',
      }}
    >
      {/* Top-left crystalline highlight */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.7) 0%, transparent 65%)',
        }}
      />

      {isOpen ? (
        /* Minimal close — obsidian */
        <svg
          className="w-4.5 h-4.5 relative z-10"
          fill="none"
          stroke="#121619"
          strokeWidth={2.2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        /* Obsidian "M" monogram */
        <span
          className="relative z-10 font-serif font-bold text-[18px] select-none leading-none"
          style={{ color: '#121619', letterSpacing: '-0.02em' }}
        >
          M
        </span>
      )}
    </button>
  );
};

export default MayaButton;
