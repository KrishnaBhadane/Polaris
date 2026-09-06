import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Compass,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  X,
  Building,
  MapPin,
  ChevronRight,
  Trash2,
  Loader2
} from 'lucide-react';
import { getMySubmissions, getSubmissionById, removeContent } from '../services/content.service';
import type { IContentItem, ContentType, ContentStatus } from '../types/content.types';

const typeIcons: Record<ContentType, React.ReactNode> = {
  REPORT: <FileText className="w-3.5 h-3.5 text-sky-600" />,
  PUBLICATION: <BookOpen className="w-3.5 h-3.5 text-indigo-600" />,
  DATASET: <Database className="w-3.5 h-3.5 text-emerald-600" />,
  IMAGE: <ImageIcon className="w-3.5 h-3.5 text-purple-600" />,
  VIDEO: <VideoIcon className="w-3.5 h-3.5 text-rose-600" />,
  ACTIVITY: <Compass className="w-3.5 h-3.5 text-amber-600" />,
};

const statusBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  PUBLISHED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  REJECTED: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  REMOVED: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    border: 'border-neutral-300',
  },
};

export const ScientistSubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContentStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ContentType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Item for Detail Modal / Panel
  const [selectedSubmission, setSelectedSubmission] = useState<IContentItem | null>(null);

  // Removal Modal State
  const [removingItem, setRemovingItem] = useState<IContentItem | null>(null);
  const [removalReason, setRemovalReason] = useState<string>('');
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMySubmissions();
      setSubmissions(data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to retrieve your submissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleInspectSubmission = async (item: IContentItem) => {
    setSelectedSubmission(item);
    try {
      const detail = await getSubmissionById(item._id);
      if (detail) {
        setSelectedSubmission(detail);
      }
    } catch {
      // Keep basic item state
    }
  };

  const handleConfirmRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingItem) return;

    try {
      setIsRemoving(true);
      setError(null);
      setSuccessMessage(null);
      const res = await removeContent(removingItem._id, removalReason.trim());
      if (res.success) {
        setSuccessMessage(`Submission "${removingItem.title}" has been removed.`);
        setSubmissions((prev) =>
          prev.map((s) =>
            s._id === removingItem._id
              ? { ...s, status: 'REMOVED', removedAt: new Date().toISOString(), removalReason: removalReason.trim() }
              : s
          )
        );
        if (selectedSubmission?._id === removingItem._id) {
          setSelectedSubmission((prev) =>
            prev ? { ...prev, status: 'REMOVED', removedAt: new Date().toISOString(), removalReason: removalReason.trim() } : null
          );
        }
        setRemovingItem(null);
        setRemovalReason('');
      } else {
        setError(res.message || 'Failed to remove submission.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to remove submission.'
      );
    } finally {
      setIsRemoving(false);
    }
  };

  // Filter Logic
  const filteredSubmissions = submissions.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'ALL' && item.type !== typeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchTopic = item.researchTopic?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchTopic) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-sky-600 uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>Submissions Log</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              My Submissions
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Track peer review status, administrative verification, and published polar records.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={fetchSubmissions}
              className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <Link
              to="/scientist/upload"
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Upload</span>
            </Link>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100/80 rounded-2xl border border-neutral-200/60 max-w-fit">
            {(['ALL', 'PENDING', 'PUBLISHED', 'REJECTED', 'REMOVED'] as const).map((status) => {
              const count =
                status === 'ALL'
                  ? submissions.length
                  : submissions.filter((s) => s.status === status).length;
              const isSelected = statusFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-white text-neutral-900 shadow-sm border border-black/[0.04]'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <span>{status === 'ALL' ? 'All Submissions' : status === 'REMOVED' ? 'Removed' : status}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-neutral-100 text-neutral-800' : 'text-neutral-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Content Type Selectors */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your submissions by title, abstract, topic..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 transition-colors shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-mono text-neutral-400 shrink-0 hidden sm:inline mr-1">
                Type:
              </span>
              {(['ALL', 'REPORT', 'PUBLICATION', 'DATASET', 'IMAGE', 'VIDEO', 'ACTIVITY'] as const).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      typeFilter === t
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
                    }`}
                  >
                    {t === 'ALL' ? 'All Types' : t}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Submissions List */}
        {loading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 space-y-3 animate-pulse">
            <div className="h-4 bg-neutral-100 rounded w-1/4" />
            <div className="h-16 bg-neutral-50 rounded-xl w-full" />
            <div className="h-16 bg-neutral-50 rounded-xl w-full" />
            <div className="h-16 bg-neutral-50 rounded-xl w-full" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900">
                No matching submissions found
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {submissions.length === 0
                  ? 'You have not submitted any scientific records yet.'
                  : 'Try clearing your search or status filters.'}
              </p>
            </div>
            {submissions.length === 0 && (
              <div className="pt-1">
                <Link
                  to="/scientist/upload"
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Scientific Record</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden divide-y divide-neutral-100">
            {filteredSubmissions.map((item) => {
              const statusStyle =
                statusBadgeStyles[item.status || 'PENDING'] || statusBadgeStyles.PENDING;

              return (
                <div
                  key={item._id}
                  onClick={() => handleInspectSubmission(item)}
                  className="p-4 sm:p-6 hover:bg-neutral-50/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 flex-1 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-semibold text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-md">
                        {typeIcons[item.type]}
                        <span>{item.type}</span>
                      </span>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                      >
                        {item.status || 'PENDING'}
                      </span>

                      <span className="text-[11px] font-mono text-neutral-400">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 group-hover:text-sky-600 transition-colors">
                      {item.title}
                    </h3>

                    {item.thumbnailUrl && (
                      <div className="flex items-center space-x-2.5 pt-1">
                        <div className="w-12 h-9 rounded-lg overflow-hidden border border-neutral-200 shrink-0 bg-neutral-900">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">Thumbnail attached</span>
                      </div>
                    )}

                    {item.description && (
                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 font-mono pt-0.5">
                      {item.institution && (
                        <span className="flex items-center space-x-1">
                          <Building className="w-3 h-3 text-neutral-400" />
                          <span>{item.institution}</span>
                        </span>
                      )}
                      {item.region && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          <span>{item.region}</span>
                        </span>
                      )}
                      {item.expedition && <span>• {item.expedition}</span>}
                    </div>

                    {/* Rejection Notice Snippet */}
                    {item.status === 'REJECTED' && item.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 mt-2">
                        <span className="font-semibold block text-[10px] text-neutral-500 uppercase font-mono">Reviewer note:</span>
                        <span className="font-medium">{item.rejectionReason}</span>
                      </div>
                    )}

                    {/* Removal Notice Snippet */}
                    {item.status === 'REMOVED' && (
                      <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-600 mt-2 space-y-0.5">
                        <span className="font-semibold block text-[10px] text-neutral-500 uppercase font-mono">Status: Removed</span>
                        {item.removalReason ? (
                          <span className="font-normal text-neutral-700">Reason: {item.removalReason}</span>
                        ) : (
                          <span className="font-normal text-neutral-500">Removed from public POLARIS archive.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Action Trigger */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                    <div className="flex items-center space-x-2">
                      {item.status !== 'REMOVED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemovingItem(item);
                          }}
                          className="text-[11px] font-medium text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-neutral-100 inline-flex items-center space-x-1"
                          title="Remove submission"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}

                      <span className="text-xs font-semibold text-neutral-700 inline-flex items-center space-x-1 group-hover:text-sky-600 transition-colors">
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>

                    {item.status === 'PUBLISHED' && (
                      <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Live on Explore</span>
                      </span>
                    )}
                    {item.status === 'REMOVED' && (
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Modal / Inspection Drawer */}
        {selectedSubmission && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedSubmission(null)}
          >
            <div
              className="bg-white rounded-3xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl text-neutral-900 space-y-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-semibold text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-md">
                      {typeIcons[selectedSubmission.type]}
                      <span>{selectedSubmission.type}</span>
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        (statusBadgeStyles[selectedSubmission.status || 'PENDING'] || statusBadgeStyles.PENDING).bg
                      } ${(statusBadgeStyles[selectedSubmission.status || 'PENDING'] || statusBadgeStyles.PENDING).text} ${(statusBadgeStyles[selectedSubmission.status || 'PENDING'] || statusBadgeStyles.PENDING).border}`}
                    >
                      {selectedSubmission.status || 'PENDING'}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900 pt-1 leading-snug">
                    {selectedSubmission.title}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Specific Banners */}
              {selectedSubmission.status === 'PENDING' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start space-x-3">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Under Review:</span>
                    <p className="mt-0.5 text-neutral-700">
                      This research artifact is currently queued in administrative moderation. Once validated, it will appear publicly across POLARIS.
                    </p>
                  </div>
                </div>
              )}

              {selectedSubmission.status === 'REJECTED' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-3">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Submission Not Approved:</span>
                    {selectedSubmission.rejectionReason && (
                      <p className="font-medium text-rose-900 bg-white p-2.5 rounded-xl border border-rose-200">
                        {selectedSubmission.rejectionReason}
                      </p>
                    )}
                    <p className="text-neutral-600">
                      You may adjust the metadata or provide a compliant dataset/file and re-upload.
                    </p>
                  </div>
                </div>
              )}

              {selectedSubmission.status === 'REMOVED' && (
                <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 flex items-start space-x-3">
                  <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold block text-neutral-900">Submission Removed:</span>
                    <p className="text-neutral-600">
                      This record was removed and is no longer available in public discovery, search, or expedition hubs.
                    </p>
                    {selectedSubmission.removalReason && (
                      <p className="mt-1 text-[11px] font-mono text-neutral-600">
                        Reason: {selectedSubmission.removalReason}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedSubmission.status === 'PUBLISHED' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">Live and Publicly Indexed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/content/${selectedSubmission._id}`}
                      className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors inline-flex items-center space-x-1"
                    >
                      <span>View Public Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      to={`/?tab=outreach&contentId=${selectedSubmission._id}#summary-section`}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors inline-flex items-center space-x-1.5 shadow-xs text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Open in Outreach Studio</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Abstract */}
              <div className="space-y-1.5 text-xs text-neutral-700">
                <span className="font-semibold text-neutral-900 block text-xs">Description / Abstract:</span>
                <p className="leading-relaxed whitespace-pre-line bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100">
                  {selectedSubmission.description || 'No description provided.'}
                </p>
              </div>

              {/* Key Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">Institution</span>
                  <span className="font-semibold text-neutral-800">{selectedSubmission.institution || '—'}</span>
                </div>
                <div className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">Region</span>
                  <span className="font-semibold text-neutral-800">{selectedSubmission.region || '—'}</span>
                </div>
                <div className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">Expedition</span>
                  <span className="font-semibold text-neutral-800">{selectedSubmission.expedition || '—'}</span>
                </div>
                <div className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">Topic</span>
                  <span className="font-semibold text-neutral-800">{selectedSubmission.researchTopic || '—'}</span>
                </div>
              </div>

              {/* Keywords */}
              {selectedSubmission.keywords && selectedSubmission.keywords.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedSubmission.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-mono"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] font-mono text-neutral-400">
                    ID: {selectedSubmission._id}
                  </span>
                  {selectedSubmission.status !== 'REMOVED' && (
                    <button
                      onClick={() => setRemovingItem(selectedSubmission)}
                      className="text-xs font-semibold text-neutral-500 hover:text-rose-600 transition-colors cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Submission</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Removal Confirmation Modal */}
        {removingItem && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setRemovingItem(null)}
          >
            <div
              className="bg-white rounded-3xl border border-neutral-200 max-w-md w-full p-6 sm:p-8 shadow-2xl text-neutral-900 space-y-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1.5 border-b border-neutral-100 pb-3">
                <h3 className="text-base font-bold text-neutral-900">
                  Remove this submission?
                </h3>
                <p className="text-xs text-neutral-500">
                  This will remove it from public POLARIS records.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase block">Submission Title</span>
                <h4 className="text-xs font-semibold text-neutral-800 line-clamp-2">
                  {removingItem.title}
                </h4>
              </div>

              <form onSubmit={handleConfirmRemove} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-600 block">
                    Optional removal note
                  </label>
                  <input
                    type="text"
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    placeholder="e.g. Superseded by newer telemetry dataset"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setRemovingItem(null)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRemoving}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {isRemoving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <span>Remove</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScientistSubmissionsPage;

