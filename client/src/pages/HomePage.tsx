import type { FC } from 'react';
import { HealthStatus } from '../components/HealthStatus';

export const HomePage: FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium uppercase tracking-widest">
            POLARIS Architecture
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
            POLARIS MERN Stack
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base">
            Clean, modular Full-Stack foundation with React, Vite, TypeScript, Tailwind CSS, Node.js & Express.
          </p>
        </div>

        {/* Stack Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 uppercase font-semibold">Client</div>
            <div className="text-sm font-medium text-slate-200 mt-1">React + Vite</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 uppercase font-semibold">Language</div>
            <div className="text-sm font-medium text-slate-200 mt-1">TypeScript</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 uppercase font-semibold">Styling</div>
            <div className="text-sm font-medium text-slate-200 mt-1">Tailwind CSS</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 uppercase font-semibold">Server</div>
            <div className="text-sm font-medium text-slate-200 mt-1">Express.js</div>
          </div>
        </div>

        {/* Health Check Widget */}
        <HealthStatus />

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          POLARIS Workspace Initialized & Connected to GitHub Repository
        </div>
      </div>
    </div>
  );
};
