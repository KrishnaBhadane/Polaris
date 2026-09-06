import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white text-neutral-900">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
        <Compass className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <div className="text-xs font-mono uppercase tracking-widest text-sky-600 font-semibold">
          404 &bull; Out of Range
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Location Not Found</h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
          The requested polar coordinates or page route does not exist within the POLARIS registry.
        </p>
      </div>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-full transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
