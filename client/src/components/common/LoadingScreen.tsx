import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Initializing POLARIS...' }) => {
  return (
    <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 select-none">
      <div className="relative flex items-center justify-center mb-6">
        {/* Subtle ice blue pulsing halo */}
        <div className="absolute w-16 h-16 rounded-full bg-sky-500/10 animate-ping" />
        <div className="absolute w-12 h-12 rounded-full border border-sky-400/20" />
        
        {/* Core polar beacon */}
        <div className="w-4 h-4 rounded-full bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
      </div>

      <div className="text-center">
        <h2 className="text-xs uppercase tracking-[0.25em] text-sky-400/80 font-medium mb-1">
          POLARIS
        </h2>
        <p className="text-xs text-slate-400 font-normal">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
