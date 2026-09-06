import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Loader2, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContentCard } from '../components/content/ContentCard';
import { getRecentContent, searchContent } from '../services/content.service';
import type { IContentItem, ContentType } from '../types/content.types';

type FilterOption = 'ALL' | 'REPORT' | 'PUBLICATION' | 'DATASET' | 'IMAGE' | 'VIDEO' | 'ACTIVITY';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialType = (searchParams.get('type')?.toUpperCase() as FilterOption) || 'ALL';

  const [items, setItems] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(initialType);
  const [query, setQuery] = useState<string>(initialQ);
  const [searchInput, setSearchInput] = useState<string>(initialQ);

  const FILTERS: { label: string; value: FilterOption }[] = [
    { label: t('explore.allTypes', 'All'), value: 'ALL' },
    { label: t('explore.reports', 'Reports'), value: 'REPORT' },
    { label: t('explore.publications', 'Publications'), value: 'PUBLICATION' },
    { label: t('explore.datasets', 'Datasets'), value: 'DATASET' },
    { label: t('explore.images', 'Images'), value: 'IMAGE' },
    { label: t('explore.videos', 'Videos'), value: 'VIDEO' },
    { label: t('explore.activities', 'Activities'), value: 'ACTIVITY' },
  ];

  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    const typeParam = (searchParams.get('type')?.toUpperCase() as FilterOption) || 'ALL';
    setQuery(qParam);
    setSearchInput(qParam);
    setSelectedFilter(typeParam);
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const fetchRecords = async () => {
      setLoading(true);
      try {
        if (query.trim().length > 0) {
          const filterType = selectedFilter === 'ALL' ? undefined : (selectedFilter as ContentType);
          const res = await searchContent(query.trim(), filterType);
          if (isMounted) setItems(res.items);
        } else if (selectedFilter !== 'ALL') {
          const res = await searchContent(undefined, selectedFilter as ContentType);
          if (isMounted) setItems(res.items);
        } else {
          const recent = await getRecentContent();
          if (isMounted) setItems(recent);
        }
      } catch {
        if (isMounted) setItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecords();
    return () => {
      isMounted = false;
    };
  }, [query, selectedFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = searchInput.trim();
    setQuery(cleanQ);
    const newParams = new URLSearchParams();
    if (cleanQ) newParams.set('q', cleanQ);
    if (selectedFilter !== 'ALL') newParams.set('type', selectedFilter);
    setSearchParams(newParams);
  };

  const handleFilterChange = (filter: FilterOption) => {
    setSelectedFilter(filter);
    const newParams = new URLSearchParams();
    if (query) newParams.set('q', query);
    if (filter !== 'ALL') newParams.set('type', filter);
    setSearchParams(newParams);
  };

  const handleClear = () => {
    setQuery('');
    setSearchInput('');
    setSelectedFilter('ALL');
    setSearchParams(new URLSearchParams());
  };

  const isSearchActive = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Clean Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              {isSearchActive ? t('explore.title', 'Search Results') : t('recent.title', 'Recently Uploaded')}
            </h1>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full md:w-80">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('explore.searchPlaceholder', 'Search expeditions, ice, topics...')}
              className="w-full pl-10 pr-10 py-2 bg-neutral-50 border border-neutral-200 rounded-full text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center space-x-1 text-xs text-neutral-400 mr-1 hidden sm:flex">
              <Filter className="w-3.5 h-3.5" />
              <span>Type:</span>
            </div>
            {FILTERS.map((f) => {
              const active = selectedFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => handleFilterChange(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-white shadow-sm font-semibold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {(query || selectedFilter !== 'ALL') && (
            <button
              onClick={handleClear}
              className="text-xs text-neutral-500 hover:text-neutral-900 underline flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>{t('explore.clearFilters', 'Reset Filters')}</span>
            </button>
          )}
        </div>

        {/* Content Card Grid */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
            <span className="text-xs font-mono text-neutral-400">{t('common.loading', 'Loading records...')}</span>
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <ContentCard key={item._id} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-2xl bg-neutral-50 border border-neutral-200 p-8 space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">{t('explore.noResults', 'No Records Found')}</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              {isSearchActive
                ? `No published records matched "${query}".`
                : 'No published records under this category.'}
            </p>
            <button
              onClick={handleClear}
              className="ice-crystal-btn px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <span>{t('hero.exploreAll', 'View All Records')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
