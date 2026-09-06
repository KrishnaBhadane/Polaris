import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Compass,
  ExternalLink,
  Download,
  Calendar,
  User,
  Building,
  MapPin,
  AlertCircle,
  Share2,
  Check,
  Maximize2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getContentById, getRecentContent } from '../services/content.service';
import { createExpeditionSlug } from '../services/expedition.service';
import type { IContentItem, ContentType } from '../types/content.types';
import { AISummaryWidget } from '../components/content/AISummaryWidget';
import { useAuth } from '../context/AuthContext';

const typeBadgeStyles: Record<
  ContentType,
  { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
> = {
  REPORT: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    icon: <FileText className="w-3.5 h-3.5 text-sky-600" />,
    label: 'Scientific Report',
  },
  PUBLICATION: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600" />,
    label: 'Publication',
  },
  DATASET: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <Database className="w-3.5 h-3.5 text-emerald-600" />,
    label: 'Polar Dataset',
  },
  IMAGE: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: <ImageIcon className="w-3.5 h-3.5 text-purple-600" />,
    label: 'Imagery / Satellite',
  },
  VIDEO: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <VideoIcon className="w-3.5 h-3.5 text-rose-600" />,
    label: 'Video Footage',
  },
  ACTIVITY: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Compass className="w-3.5 h-3.5 text-amber-600" />,
    label: 'Expedition Activity',
  },
};

export const ContentDetailPage: React.FC = () => {
  const { user, authenticated } = useAuth();
  const canAccessOutreach = Boolean(
    authenticated && (user?.role === 'SCIENTIST' || user?.role === 'ADMIN')
  );

  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<IContentItem | null>(null);
  const [relatedItems, setRelatedItems] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);

  const fetchRecord = async () => {
    if (!id) {
      setError('Missing content ID.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getContentById(id);
      if (data) {
        setContent(data);
        // Fetch related records
        try {
          const recent = await getRecentContent();
          const related = recent
            .filter((item) => item._id !== id)
            .filter((item) => item.type === data.type || item.researchTopic === data.researchTopic || item.region === data.region)
            .slice(0, 3);
          setRelatedItems(related.length > 0 ? related : recent.filter((i) => i._id !== id).slice(0, 3));
        } catch {
          setRelatedItems([]);
        }
      } else {
        setError('Research record not found or is no longer publicly available.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to retrieve polar record.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-[75vh] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-neutral-200 rounded" />
          <div className="h-8 w-24 bg-neutral-200 rounded-lg" />
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-32 bg-neutral-200 rounded-full" />
            <div className="h-6 w-20 bg-neutral-200 rounded-full" />
          </div>
          <div className="h-8 w-3/4 bg-neutral-200 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-neutral-100 rounded" />
            <div className="h-4 w-5/6 bg-neutral-100 rounded" />
          </div>
          <div className="h-64 w-full bg-neutral-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not Found / Error State
  if (error || !content) {
    return (
      <div className="min-h-[60vh] max-w-2xl mx-auto px-4 py-16 text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
          <AlertCircle className="w-6 h-6 text-neutral-600" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-neutral-900">
            {error || 'Research record not found.'}
          </h1>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            The requested polar research artifact might have been removed, reclassified, or is unavailable.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={fetchRecord}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
          <Link
            to="/explore"
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Explore</span>
          </Link>
        </div>
      </div>
    );
  }

  const badge = typeBadgeStyles[content.type] || typeBadgeStyles.REPORT;
  const targetUrl = content.fileUrl || content.externalUrl || '';

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Subtle Navigation Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/explore"
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Explore</span>
          </Link>

          <div className="flex items-center space-x-2">
            {canAccessOutreach && (
              <Link
                to={`/?tab=outreach&contentId=${content._id}#summary-section`}
                className="inline-flex items-center space-x-1.5 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Open in Outreach Studio</span>
              </Link>
            )}

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
                  <span>Share Record</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Primary Content Container */}
        <article className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10 shadow-sm space-y-6">
          {/* Header Metadata Pill & Year */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5">
            <div className="flex items-center space-x-2.5">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </span>
              {content.region && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">
                  <MapPin className="w-3 h-3 text-neutral-500" />
                  <span>{content.region}</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono text-neutral-500">
              {content.externalUrl && (
                <a
                  href={content.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-900 border border-sky-200 transition-colors font-sans"
                  title="Open authoritative source in official repository"
                >
                  <span>Official Source</span>
                  <ExternalLink className="w-3 h-3 text-sky-600" />
                </a>
              )}
              {content.year && (
                <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-semibold text-neutral-800">
                  {content.year}
                </span>
              )}
              <span>
                {content.createdAt
                  ? new Date(content.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : ''}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 leading-snug break-words">
              {content.title}
            </h1>
            <p className="max-w-4xl text-sm sm:text-base text-neutral-600 leading-relaxed font-normal break-words">
              {content.description}
            </p>
          </div>

          {/* TYPE-SPECIFIC HERO PREVIEW AREA */}
          <div className="pt-2">
            {/* 1. REPORT & PUBLICATION */}
            {(content.type === 'REPORT' || content.type === 'PUBLICATION') && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900">
                        {content.type === 'PUBLICATION' ? 'Scientific Publication Document' : 'Expedition Technical Report'}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        {content.fileUrl ? 'Official verified PDF document' : 'External research repository'}
                      </p>
                    </div>
                  </div>

                  {targetUrl && (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors shrink-0 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Open / Download Report</span>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                    </a>
                  )}
                </div>

                {/* Optional Document Cover / Thumbnail */}
                {content.thumbnailUrl && !content.fileUrl?.endsWith('.pdf') && (
                  <div className="w-full aspect-[21/9] sm:aspect-[24/9] max-h-64 rounded-xl overflow-hidden border border-sky-200/60 bg-neutral-900">
                    <img
                      src={content.thumbnailUrl}
                      alt={content.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}

                {/* PDF Viewer Embed if PDF file URL exists */}
                {content.fileUrl && content.fileUrl.endsWith('.pdf') && (
                  <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-900 shadow-sm">
                    <iframe
                      src={`${content.fileUrl}#toolbar=0`}
                      title={content.title}
                      className="w-full h-[580px] bg-neutral-800"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 2. IMAGE */}
            {content.type === 'IMAGE' && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 group">
                  <img
                    src={content.fileUrl || content.thumbnailUrl || 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1600&q=80'}
                    alt={content.title}
                    className="w-full h-auto max-h-[560px] object-contain mx-auto"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                    <button
                      onClick={() => setImageModalOpen(true)}
                      className="p-2 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-medium backdrop-blur-sm transition-colors cursor-pointer"
                      title="Inspect Full Image"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    {targetUrl && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-medium backdrop-blur-sm transition-colors"
                        title="Open Source Image"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Fullscreen Lightbox Modal */}
                {imageModalOpen && (
                  <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
                    onClick={() => setImageModalOpen(false)}
                  >
                    <div className="max-w-6xl max-h-[90vh] relative">
                      <img
                        src={content.fileUrl || content.thumbnailUrl}
                        alt={content.title}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                      />
                      <p className="text-center text-xs text-neutral-400 mt-2 font-mono">
                        Click anywhere to close full preview
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. VIDEO */}
            {content.type === 'VIDEO' && (
              <div className="space-y-4">
                {content.fileUrl ? (
                  <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video
                      src={content.fileUrl}
                      controls
                      poster={content.thumbnailUrl}
                      className="w-full h-full object-contain"
                    >
                      Your browser does not support HTML5 video streaming.
                    </video>
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-neutral-200 bg-neutral-900 text-white p-8 text-center space-y-4 overflow-hidden">
                    {content.thumbnailUrl && (
                      <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <img
                          src={content.thumbnailUrl}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="relative z-10 space-y-4">
                      <VideoIcon className="w-10 h-10 text-sky-400 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Polar Video Stream</h4>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                          This polar video record is hosted in an external scientific repository.
                        </p>
                      </div>
                      {targetUrl && (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center space-x-2 transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Launch Video Stream</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. DATASET */}
            {content.type === 'DATASET' && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-6 sm:p-8 space-y-5">
                {content.thumbnailUrl && (
                  <div className="w-full aspect-[21/9] sm:aspect-[24/9] max-h-64 rounded-xl overflow-hidden border border-emerald-200/60 bg-neutral-900">
                    <img
                      src={content.thumbnailUrl}
                      alt={content.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900">
                        Polar Scientific Dataset
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Telemetry, observational matrix, and geodetic measurements
                      </p>
                    </div>
                  </div>

                  {targetUrl && (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors shrink-0 shadow-sm"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Official Dataset</span>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-mono text-neutral-400 block uppercase">Format</span>
                    <span className="font-semibold text-neutral-800">NetCDF / CSV / GeoJSON</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-mono text-neutral-400 block uppercase">Coverage</span>
                    <span className="font-semibold text-neutral-800">{content.region || 'Antarctic Sector'}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-mono text-neutral-400 block uppercase">License</span>
                    <span className="font-semibold text-neutral-800">Open CC-BY 4.0</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-mono text-neutral-400 block uppercase">Validation</span>
                    <span className="font-semibold text-emerald-700">POLARIS Verified</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ACTIVITY */}
            {content.type === 'ACTIVITY' && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-6 sm:p-8 space-y-4">
                {content.thumbnailUrl && (
                  <div className="w-full aspect-[21/9] sm:aspect-[24/9] max-h-64 rounded-xl overflow-hidden border border-amber-200/60 bg-neutral-900">
                    <img
                      src={content.thumbnailUrl}
                      alt={content.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">
                      Polar Expedition Field Activity Record
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Field deployment, telemetry logs, and station scientific activity
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-amber-100 text-xs sm:text-sm text-neutral-700 leading-relaxed">
                  <span className="font-semibold text-neutral-900 block mb-1">Field Deployment Scope:</span>
                  This activity was logged during the {content.expedition || 'scientific season'} at {content.region || 'Polar Sector'}. Field research tracked local parameters under the supervision of {content.scientistName} ({content.institution}).
                </div>
              </div>
            )}

          </div>

          {/* CONCISE ESSENTIAL METADATA */}
          <div className="pt-6 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start space-x-3">
              <User className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Lead Scientist</span>
                <span className="text-xs font-semibold text-neutral-800">{content.scientistName}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Building className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Institution</span>
                <span className="text-xs font-semibold text-neutral-800">{content.institution || 'Polar Research Org'}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Expedition</span>
                {content.expedition ? (
                  <Link
                    to={`/expeditions/${createExpeditionSlug(content.expedition)}`}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 group transition-colors"
                    title={`View ${content.expedition} hub`}
                  >
                    <span>{content.expedition}</span>
                    <ArrowRight className="w-3 h-3 text-sky-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-neutral-800">Antarctic Expedition</span>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Research Topic</span>
                <span className="text-xs font-semibold text-neutral-800">{content.researchTopic || 'Cryosphere & Climate'}</span>
              </div>
            </div>
          </div>

          {/* KEYWORDS */}
          {content.keywords && content.keywords.length > 0 && (
            <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-neutral-400 uppercase mr-1">Keywords:</span>
              {content.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* AI RESEARCH SUMMARY SECTION */}
        <AISummaryWidget
          contentId={content._id}
          contentTitle={content.title}
        />

        {/* RELATED RESEARCH SECTION */}
        {relatedItems.length > 0 && (
          <section id="related-research" className="space-y-4 pt-4 border-t border-neutral-100 scroll-mt-20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
                Related Research
              </h3>
              <Link
                to="/explore"
                className="text-xs text-sky-600 hover:text-sky-700 font-medium transition-colors"
              >
                View all in Explore →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedItems.map((item) => {
                const relBadge = typeBadgeStyles[item.type] || typeBadgeStyles.REPORT;
                return (
                  <Link
                    key={item._id}
                    to={`/content/${item._id}`}
                    className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${relBadge.bg} ${relBadge.text} ${relBadge.border}`}>
                          {relBadge.icon}
                          <span>{relBadge.label}</span>
                        </span>
                        {item.year && (
                          <span className="text-[10px] font-mono text-neutral-400 font-semibold">
                            {item.year}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-neutral-900 group-hover:text-sky-600 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                      <span className="truncate max-w-[140px]">{item.scientistName}</span>
                      <span className="text-sky-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Read →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ContentDetailPage;
