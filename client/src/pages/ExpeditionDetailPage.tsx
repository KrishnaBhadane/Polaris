import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Compass,
  Search,
  ArrowRight,
  AlertCircle,
  Share2,
  Check
} from 'lucide-react';
import { getExpeditionBySlug } from '../services/expedition.service';
import type { IExpeditionDetailData } from '../types/expedition.types';
import type { ContentType } from '../types/content.types';

const typeIcons: Record<ContentType, React.ReactNode> = {
  REPORT: <FileText className="w-3.5 h-3.5 text-sky-600" />,
  PUBLICATION: <BookOpen className="w-3.5 h-3.5 text-indigo-600" />,
  DATASET: <Database className="w-3.5 h-3.5 text-emerald-600" />,
  IMAGE: <ImageIcon className="w-3.5 h-3.5 text-purple-600" />,
  VIDEO: <VideoIcon className="w-3.5 h-3.5 text-rose-600" />,
  ACTIVITY: <Compass className="w-3.5 h-3.5 text-amber-600" />,
};

const typeBadgeStyles: Record<
  ContentType,
  { bg: string; text: string; border: string }
> = {
  REPORT: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  PUBLICATION: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  DATASET: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  IMAGE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  VIDEO: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  ACTIVITY: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

export const ExpeditionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [detailData, setDetailData] = useState<IExpeditionDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [researchFilter, setResearchFilter] = useState<'ALL' | 'REPORT' | 'PUBLICATION' | 'DATASET'>('ALL');
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) {
      setError('Expedition slug is missing.');
      setLoading(false);
      return;
    }

    const fetchExpedition = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getExpeditionBySlug(slug);
        if (!data) {
          setError('Expedition not found.');
        } else {
          setDetailData(data);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load expedition details.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExpedition();
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const filteredResearch = useMemo(() => {
    if (!detailData) return [];
    if (researchFilter === 'ALL') return detailData.researchRecords;
    return detailData.researchRecords.filter((r) => r.type === researchFilter);
  }, [detailData, researchFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-4 bg-neutral-100 rounded w-24" />
          <div className="h-10 bg-neutral-100 rounded-2xl w-2/3" />
          <div className="h-32 bg-neutral-50 rounded-3xl border border-neutral-100" />
        </div>
      </div>
    );
  }

  if (error || !detailData) {
    return (
      <div className="min-h-screen bg-white text-neutral-900 py-16 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">
            {error || 'Expedition not found.'}
          </h2>
          <p className="text-xs text-neutral-500">
            The requested polar expedition mission hub could not be located in published records.
          </p>
          <div className="pt-2">
            <Link
              to="/expeditions"
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Expeditions</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { expedition, scientists, mediaRecords, activityRecords } = detailData;

  const yearText =
    expedition.years.length === 1
      ? String(expedition.years[0])
      : expedition.years.length > 1
      ? `${expedition.years[0]} – ${expedition.years[expedition.years.length - 1]}`
      : 'Active';

  const typeCounts = expedition.typeCounts || {
    REPORT: 0,
    PUBLICATION: 0,
    DATASET: 0,
    IMAGE: 0,
    VIDEO: 0,
    ACTIVITY: 0,
  };

  const statItems = [
    { label: 'Reports', count: typeCounts.REPORT, icon: <FileText className="w-3.5 h-3.5 text-sky-600" /> },
    { label: 'Publications', count: typeCounts.PUBLICATION, icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> },
    { label: 'Datasets', count: typeCounts.DATASET, icon: <Database className="w-3.5 h-3.5 text-emerald-600" /> },
    { label: 'Images', count: typeCounts.IMAGE, icon: <ImageIcon className="w-3.5 h-3.5 text-purple-600" /> },
    { label: 'Videos', count: typeCounts.VIDEO, icon: <VideoIcon className="w-3.5 h-3.5 text-rose-600" /> },
    { label: 'Activities', count: typeCounts.ACTIVITY, icon: <Compass className="w-3.5 h-3.5 text-amber-600" /> },
  ].filter((s) => s.count > 0);

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12">
        {/* Navigation & Share Row */}
        <div className="flex items-center justify-between">
          <Link
            to="/expeditions"
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Expeditions</span>
          </Link>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center space-x-1.5 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {linkCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>Share Mission</span>
              </>
            )}
          </button>
        </div>

        {/* Top Header Card */}
        <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-neutral-100 text-neutral-800 border border-neutral-200">
                {expedition.region}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono text-neutral-600 bg-neutral-50 border border-neutral-200">
                {yearText}
              </span>
            </div>

            <div className="text-xs font-mono text-neutral-500">
              <span className="font-bold text-neutral-900">{expedition.totalRecords}</span>{' '}
              {expedition.totalRecords === 1 ? 'Research Record' : 'Research Records'}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              {expedition.name}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-3xl">
              POLARIS currently catalogues{' '}
              <span className="font-semibold text-neutral-900">{expedition.totalRecords} published records</span>{' '}
              from this polar expedition across peer-reviewed reports, primary datasets, field activities, and archival media.
            </p>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => navigate(`/explore?q=${encodeURIComponent(expedition.name)}`)}
              className="ice-crystal-btn px-5 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-2 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-sky-600" />
              <span>Explore All Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {scientists.length > 0 && (
              <span className="text-xs font-mono text-neutral-500">
                {scientists.length} {scientists.length === 1 ? 'Contributing Scientist' : 'Contributing Scientists'}
              </span>
            )}
          </div>
        </div>

        {/* Overview Stats (Only Categories with Content) */}
        {statItems.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Mission Output Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {statItems.map((stat) => (
                <div
                  key={stat.label}
                  className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 flex items-center space-x-3 shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-base font-bold text-neutral-900">{stat.count}</div>
                    <div className="text-[10px] text-neutral-500 font-mono uppercase">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Connected Research (Reports, Publications, Datasets) */}
        {detailData.researchRecords.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                  Connected Research
                </h2>
                <p className="text-xs text-neutral-500">
                  Reports, publications, and scientific datasets published under this expedition
                </p>
              </div>

              {/* Research Filter Tabs */}
              <div className="flex items-center space-x-1 self-start sm:self-auto">
                {(['ALL', 'REPORT', 'PUBLICATION', 'DATASET'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setResearchFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      researchFilter === filter
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                    }`}
                  >
                    {filter === 'ALL'
                      ? 'All'
                      : filter.charAt(0) + filter.slice(1).toLowerCase() + 's'}
                  </button>
                ))}
              </div>
            </div>

            {filteredResearch.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-neutral-50/50 border border-neutral-100 text-xs text-neutral-400">
                No items matching the selected filter.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredResearch.map((item) => {
                  const badge = typeBadgeStyles[item.type] || typeBadgeStyles.REPORT;
                  return (
                    <Link
                      key={item._id}
                      to={`/content/${item._id}`}
                      className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-neutral-50/70 border border-neutral-200/90 hover:border-sky-300 transition-all block group shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {typeIcons[item.type]}
                          <span>{item.type}</span>
                        </span>

                        <span className="text-xs font-mono text-neutral-400">
                          {item.year || '2026'}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-neutral-900 group-hover:text-sky-600 transition-colors">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-1">
                        <span>{item.scientistName || 'Polaris Researcher'} {item.institution ? `• ${item.institution}` : ''}</span>
                        <span className="text-sky-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center space-x-1">
                          <span>View Record</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section: Media (Images & Videos) */}
        {mediaRecords.length > 0 && (
          <div className="space-y-4">
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                Archival Imagery & Media
              </h2>
              <p className="text-xs text-neutral-500">
                Visual observations, expedition photography, and sub-surface recordings
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {mediaRecords.map((media) => (
                <Link
                  key={media._id}
                  to={`/content/${media._id}`}
                  className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden hover:border-sky-300 hover:shadow-sm transition-all group flex flex-col justify-between"
                >
                  <div className="relative aspect-16/10 bg-neutral-100 overflow-hidden">
                    {media.fileUrl && media.type === 'IMAGE' ? (
                      <img
                        src={media.fileUrl}
                        alt={media.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                        {media.type === 'VIDEO' ? <VideoIcon className="w-8 h-8 text-rose-500" /> : <ImageIcon className="w-8 h-8 text-purple-500" />}
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-black/70 text-white backdrop-blur-xs">
                        {media.type}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <h4 className="text-xs font-bold text-neutral-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                      {media.title}
                    </h4>
                    <div className="text-[10px] font-mono text-neutral-400 truncate">
                      {media.scientistName || 'Polaris Researcher'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section: Activities (If any exist) */}
        {activityRecords.length > 0 && (
          <div className="space-y-4">
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                Field Activities & Deployments
              </h2>
              <p className="text-xs text-neutral-500">
                Campaign milestones, sensor telemetry, and observational deployments
              </p>
            </div>

            <div className="space-y-3">
              {activityRecords.map((act) => (
                <Link
                  key={act._id}
                  to={`/content/${act._id}`}
                  className="p-4 rounded-2xl bg-neutral-50/70 hover:bg-neutral-100/70 border border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-mono font-semibold uppercase">
                        Activity
                      </span>
                      <span className="text-xs font-bold text-neutral-900 group-hover:text-sky-600 transition-colors">
                        {act.title}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-xs text-neutral-500 line-clamp-2">
                        {act.description}
                      </p>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-neutral-400 shrink-0 self-end sm:self-center flex items-center space-x-2">
                    <span>{act.year || '2026'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section: Scientists Involved */}
        {scientists.length > 0 && (
          <div className="space-y-4">
            <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                  Contributing Scientists
                </h2>
                <p className="text-xs text-neutral-500">
                  Principal investigators and researchers who authored or contributed to this expedition's records
                </p>
              </div>
              <div className="text-xs font-mono text-neutral-400">
                {scientists.length} {scientists.length === 1 ? 'Scientist' : 'Scientists'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {scientists.map((sci, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 flex items-center space-x-3 shadow-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs shrink-0 font-mono">
                    {sci.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">
                      {sci.name}
                    </h4>
                    {sci.institution && (
                      <p className="text-[10px] text-neutral-500 truncate font-mono">
                        {sci.institution}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpeditionDetailPage;
