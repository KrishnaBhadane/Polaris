import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Filter, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContentCard } from '../content/ContentCard';
import { getRecentContent, searchContent } from '../../services/content.service';
import type { IContentItem, ContentType } from '../../types/content.types';

interface HomeExploreSectionProps {
  initialSearchQuery?: string;
  onClearSearch?: () => void;
}

type FilterOption = 'ALL' | 'REPORT' | 'PUBLICATION' | 'DATASET' | 'IMAGE' | 'VIDEO';

export const HomeExploreSection: React.FC<HomeExploreSectionProps> = ({
  initialSearchQuery = '',
  onClearSearch,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('ALL');
  const [activeQuery, setActiveQuery] = useState<string>(initialSearchQuery);
  const [localSearchInput, setLocalSearchInput] = useState<string>(initialSearchQuery);

  const FILTERS: { label: string; value: FilterOption }[] = [
    { label: t('explore.allTypes', 'All'), value: 'ALL' },
    { label: t('explore.reports', 'Reports'), value: 'REPORT' },
    { label: t('explore.publications', 'Publications'), value: 'PUBLICATION' },
    { label: t('explore.datasets', 'Datasets'), value: 'DATASET' },
    { label: t('explore.images', 'Images'), value: 'IMAGE' },
    { label: t('explore.videos', 'Videos'), value: 'VIDEO' },
  ];

  useEffect(() => {
    setActiveQuery(initialSearchQuery);
    setLocalSearchInput(initialSearchQuery);
  }, [initialSearchQuery]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      if (activeQuery && activeQuery.trim().length > 0) {
        const filterType = selectedFilter === 'ALL' ? undefined : (selectedFilter as ContentType);
        const { items: results } = await searchContent(activeQuery, filterType);
        setItems(results);
      } else if (selectedFilter !== 'ALL') {
        const { items: results } = await searchContent(undefined, selectedFilter as ContentType);
        setItems(results);
      } else {
        const recent = await getRecentContent();
        setItems(recent);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeQuery, selectedFilter]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleLocalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(localSearchInput.trim());
  };

  const handleClear = () => {
    setActiveQuery('');
    setLocalSearchInput('');
    setSelectedFilter('ALL');
    if (onClearSearch) onClearSearch();
  };

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSearchActive = activeQuery.trim().length > 0;

  return (
    <section id="explore-section" className="w-full bg-white text-neutral-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Clean Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              {isSearchActive ? t('explore.title', 'Search Results') : t('recent.title', 'Recently Uploaded')}
            </h2>
            <button
              onClick={scrollToHero}
              className="inline-flex items-center space-x-1 text-xs text-neutral-400 hover:text-sky-600 transition-colors cursor-pointer group"
              title="Return to Hero Map"
            >
              <ArrowUp className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 text-sky-500" />
              <span>Hero Map</span>
            </button>
          </div>

          {/* Inline Search / Reset Controls */}
          <div className="flex items-center space-x-2">
            {isSearchActive && (
              <button
                onClick={handleClear}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 hover:text-black rounded-full transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('common.cancel', 'Clear')}</span>
              </button>
            )}

            <form onSubmit={handleLocalSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={localSearchInput}
                onChange={(e) => setLocalSearchInput(e.target.value)}
                placeholder={t('explore.searchPlaceholder', 'Filter records...')}
                className="pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-full text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-sky-400 focus:bg-white transition-all w-44 sm:w-56"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
            </form>
          </div>
        </div>

        {/* Minimal Type Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center space-x-1 text-xs text-neutral-400 mr-1 hidden sm:flex">
            <Filter className="w-3.5 h-3.5" />
            <span>Type:</span>
          </div>

          {FILTERS.map((filter) => {
            const isSelected = selectedFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setSelectedFilter(filter.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-sm font-semibold'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Content Cards Grid */}
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
            <span className="text-xs text-neutral-400 font-mono">
              {t('common.loading', 'Loading records...')}
            </span>
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((item) => (
              <ContentCard key={item._id} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-800">{t('explore.noResults', 'No Records Found')}</h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {isSearchActive
                ? `No published content matched "${activeQuery}".`
                : 'No published records under this category.'}
            </p>
            {isSearchActive && (
              <button
                onClick={handleClear}
                className="mt-1 inline-flex items-center space-x-1 px-3.5 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-full hover:bg-sky-600 transition-colors cursor-pointer"
              >
                <span>{t('explore.clearFilters', 'Reset to All')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeExploreSection;
