import React from 'react';
import { Bookmark, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BookmarksPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 bg-white text-neutral-900">
      <div className="border-b border-neutral-200 pb-4">
        <div className="flex items-center space-x-2 text-xs text-sky-600 font-semibold uppercase tracking-wider mb-1">
          <Bookmark className="w-3.5 h-3.5" />
          <span>User Workspace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">Saved Records</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Your bookmarked expeditions, research papers, and observatory datasets.
        </p>
      </div>

      <div className="p-12 text-center rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-sky-600">
          <Bookmark className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-neutral-900">No Bookmarks Saved Yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Explore scientific content and bookmark key publications or reports for quick reference.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/explore"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-full transition-all shadow-sm"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore Research</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookmarksPage;
