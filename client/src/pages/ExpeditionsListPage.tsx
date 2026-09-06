import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  FileText,
  Database,
  Image as ImageIcon,
  Search,
  ArrowRight,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { getExpeditions } from '../services/expedition.service';
import type { IExpeditionSummary } from '../types/expedition.types';

export const ExpeditionsListPage: React.FC = () => {
  const [expeditions, setExpeditions] = useState<IExpeditionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  const fetchExpeditionsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExpeditions();
      setExpeditions(data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load expeditions catalog.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpeditionsList();
  }, []);

  // Filter expeditions
  const filteredExpeditions = useMemo(() => {
    return expeditions.filter((exp) => {
      const matchesSearch =
        !searchQuery.trim() ||
        exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.region.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion =
        selectedRegion === 'ALL' ||
        exp.region.toLowerCase().includes(selectedRegion.toLowerCase());

      return matchesSearch && matchesRegion;
    });
  }, [expeditions, searchQuery, selectedRegion]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
        {/* Minimal Intro */}
        <div className="border-b border-neutral-100 pb-5 space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-sky-600 font-mono">
            <Compass className="w-3.5 h-3.5 text-sky-500" />
            <span>Mission Archives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Expeditions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal">
            Explore India’s polar missions and their research records
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expeditions, campaigns, regions..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Region Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {['ALL', 'Antarctica', 'Arctic'].map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  selectedRegion === reg
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                }`}
              >
                {reg === 'ALL' ? 'All Missions' : reg}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchExpeditionsList}
              className="px-3 py-1 bg-white hover:bg-rose-100/50 border border-rose-200 rounded-lg text-rose-800 font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 rounded-3xl bg-neutral-50 border border-neutral-100 p-6 space-y-4" />
            ))}
          </div>
        ) : filteredExpeditions.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400 shadow-xs">
              <FolderOpen className="w-6 h-6 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900">
                {expeditions.length === 0
                  ? 'No expedition records are available yet.'
                  : 'No matching expeditions found.'}
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {expeditions.length === 0
                  ? 'Published research will populate mission archives automatically.'
                  : 'Try clearing your search query.'}
              </p>
            </div>
          </div>
        ) : (
          /* Expeditions Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExpeditions.map((exp) => {
              const yearText =
                exp.years.length === 1
                  ? String(exp.years[0])
                  : exp.years.length > 1
                  ? `${exp.years[0]} – ${exp.years[exp.years.length - 1]}`
                  : 'Active';

              const reportsCount = (exp.typeCounts?.REPORT || 0) + (exp.typeCounts?.PUBLICATION || 0);
              const datasetsCount = exp.typeCounts?.DATASET || 0;
              const mediaCount = (exp.typeCounts?.IMAGE || 0) + (exp.typeCounts?.VIDEO || 0);
              const activityCount = exp.typeCounts?.ACTIVITY || 0;

              return (
                <Link
                  key={exp.slug}
                  to={`/expeditions/${exp.slug}`}
                  className="rounded-3xl border border-neutral-200/90 bg-white p-6 hover:border-sky-400/80 hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5 group"
                >
                  <div className="space-y-3.5">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-neutral-100 text-neutral-700 border border-neutral-200 truncate">
                        {exp.region || 'Polar Region'}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                        {yearText}
                      </span>
                    </div>

                    {/* Expedition Title */}
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                      {exp.name}
                    </h3>

                    {/* Compact Breakdown */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {reportsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-mono font-medium flex items-center space-x-1">
                          <FileText className="w-2.5 h-2.5" />
                          <span>{reportsCount} {reportsCount === 1 ? 'Report' : 'Reports'}</span>
                        </span>
                      )}
                      {datasetsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-mono font-medium flex items-center space-x-1">
                          <Database className="w-2.5 h-2.5" />
                          <span>{datasetsCount} {datasetsCount === 1 ? 'Dataset' : 'Datasets'}</span>
                        </span>
                      )}
                      {mediaCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-mono font-medium flex items-center space-x-1">
                          <ImageIcon className="w-2.5 h-2.5" />
                          <span>{mediaCount} Media</span>
                        </span>
                      )}
                      {activityCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-mono font-medium flex items-center space-x-1">
                          <Compass className="w-2.5 h-2.5" />
                          <span>{activityCount} {activityCount === 1 ? 'Activity' : 'Activities'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold">
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {exp.totalRecords} {exp.totalRecords === 1 ? 'record' : 'records'}
                    </span>
                    <span className="text-sky-600 inline-flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                      <span>View Mission Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpeditionsListPage;
