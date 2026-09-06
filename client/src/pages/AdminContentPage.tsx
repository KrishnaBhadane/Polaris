import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Search,
  X,
  FileText,
  BookOpen,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Compass,
  Trash2
} from 'lucide-react';
import {
  getAllContentAdmin,
  approveContentAdmin,
  rejectContentAdmin,
  removeContentAdmin,
} from '../services/admin.service';
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

export const AdminContentPage: React.FC = () => {
  const [contentList, setContentList] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContentStatus>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rejection Modal State
  const [rejectingItem, setRejectingItem] = useState<IContentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Admin Removal Modal State
  const [removingItem, setRemovingItem] = useState<IContentItem | null>(null);
  const [adminRemovalReason, setAdminRemovalReason] = useState<string>('');

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllContentAdmin(statusFilter === 'ALL' ? undefined : statusFilter);
      setContentList(data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load content list.'
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Handle Approve
  const handleApprove = async (id: string, title: string) => {
    try {
      setApprovingId(id);
      setError(null);
      setSuccessMessage(null);
      const res = await approveContentAdmin(id);
      if (res.success) {
        setSuccessMessage(`Research record "${title}" approved and published to Explore.`);
        await fetchContent();
      } else {
        setError(res.message || 'Failed to approve content.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to approve content.'
      );
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;

    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejecting the submission.');
      return;
    }

    try {
      setProcessingAction(true);
      setError(null);
      setSuccessMessage(null);
      const res = await rejectContentAdmin(rejectingItem._id, rejectionReason.trim());
      if (res.success) {
        setSuccessMessage(`Submission "${rejectingItem.title}" rejected.`);
        setRejectingItem(null);
        setRejectionReason('');
        await fetchContent();
      } else {
        setError(res.message || 'Failed to reject content.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to reject content.'
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Admin Remove Submit
  const handleAdminRemoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingItem) return;

    if (!adminRemovalReason.trim()) {
      setError('Removal reason is required for administrative content removal.');
      return;
    }

    try {
      setProcessingAction(true);
      setError(null);
      setSuccessMessage(null);
      const res = await removeContentAdmin(removingItem._id, adminRemovalReason.trim());
      if (res.success) {
        setSuccessMessage(`Content "${removingItem.title}" removed from POLARIS public catalog.`);
        setRemovingItem(null);
        setAdminRemovalReason('');
        await fetchContent();
      } else {
        setError(res.message || 'Failed to remove content.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to remove content.'
      );
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredContent = contentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.institution?.toLowerCase().includes(q) ||
      item.scientistName?.toLowerCase().includes(q) ||
      item.researchTopic?.toLowerCase().includes(q) ||
      item.region?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-sky-600 uppercase tracking-widest">
              <FileCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>Scientific Moderation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Content Moderation Queue
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Audit submitted polar research reports, datasets, and multimedia before or after public indexing.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={fetchContent}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              title="Refresh queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Content</span>
            </button>
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

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
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

        {/* Status Filter Tabs & Search Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100/80 rounded-2xl border border-neutral-200/60 max-w-fit">
            {(['PENDING', 'PUBLISHED', 'REJECTED', 'REMOVED', 'ALL'] as const).map((st) => {
              const isSelected = statusFilter === st;
              const label =
                st === 'PENDING'
                  ? 'Pending Review'
                  : st === 'PUBLISHED'
                  ? 'Published'
                  : st === 'REJECTED'
                  ? 'Rejected'
                  : st === 'REMOVED'
                  ? 'Removed'
                  : 'All Records';

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-white text-neutral-900 shadow-sm border border-black/[0.04]'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records by title, abstract, scientist, region..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 shadow-xs transition-colors"
              />
            </div>

            <div className="text-xs font-mono text-neutral-500 self-end sm:self-center">
              Total Listed: <span className="font-bold text-neutral-900">{filteredContent.length}</span>
            </div>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 space-y-4 animate-pulse">
            <div className="h-4 bg-neutral-100 rounded w-1/4" />
            <div className="h-28 bg-neutral-50 rounded-2xl w-full" />
            <div className="h-28 bg-neutral-50 rounded-2xl w-full" />
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400 shadow-sm">
              <FileCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900">
                {contentList.length === 0
                  ? 'No records found in this category'
                  : 'No matching records found'}
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {contentList.length === 0
                  ? 'There are currently no records matching the selected status filter.'
                  : 'Try clearing your search query.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContent.map((item) => {
              const statusStyle =
                statusBadgeStyles[item.status || 'PENDING'] || statusBadgeStyles.PENDING;

              return (
                <div
                  key={item._id}
                  className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-7 shadow-sm space-y-5 hover:border-neutral-300 transition-all"
                >
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-semibold text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-md">
                          {typeIcons[item.type]}
                          <span>{item.type}</span>
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {item.status || 'PENDING'}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                        {item.title}
                      </h3>
                    </div>

                    {/* Actions Header */}
                    <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
                      {(item.fileUrl || item.externalUrl) && (
                        <a
                          href={item.fileUrl || item.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Payload</span>
                        </a>
                      )}

                      {/* Pending Moderation Actions */}
                      {item.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => setRejectingItem(item)}
                            disabled={processingAction}
                            className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => handleApprove(item._id, item.title)}
                            disabled={approvingId === item._id || processingAction}
                            className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            {approvingId === item._id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Publishing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Approve</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {/* Remove Content Action (Available for PENDING, PUBLISHED, REJECTED) */}
                      {item.status !== 'REMOVED' && (
                        <button
                          onClick={() => setRemovingItem(item)}
                          disabled={processingAction}
                          className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                          title="Remove from POLARIS"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Remove Content</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Removal Audit Info */}
                  {item.status === 'REMOVED' && (
                    <div className="p-3.5 rounded-2xl bg-neutral-100/90 border border-neutral-200 text-xs text-neutral-700 space-y-1">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span className="font-semibold text-neutral-900">Record Removed from POLARIS</span>
                      </div>
                      {item.removalReason && (
                        <p className="text-neutral-700 font-mono text-[11px] pl-6">
                          Removal Reason: <span className="font-medium">{item.removalReason}</span>
                        </p>
                      )}
                      {item.removedAt && (
                        <p className="text-neutral-500 font-mono text-[10px] pl-6">
                          Removed at: {new Date(item.removedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Rejection Notice */}
                  {item.status === 'REJECTED' && item.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <span className="font-semibold block text-[10px] uppercase font-mono text-neutral-500">Rejection Note:</span>
                      <span>{item.rejectionReason}</span>
                    </div>
                  )}

                  {/* Attached Thumbnail Preview (if present) */}
                  {item.thumbnailUrl && (
                    <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-neutral-50/80 border border-neutral-100">
                      <div className="w-16 h-12 rounded-xl overflow-hidden border border-neutral-200 shrink-0 bg-neutral-900">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-[11px] text-neutral-500 min-w-0">
                        <span className="font-semibold text-neutral-800 block">Attached Custom Thumbnail</span>
                        <a
                          href={item.thumbnailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-sky-600 hover:underline truncate block"
                        >
                          {item.thumbnailUrl}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed bg-neutral-50/60 p-4 rounded-2xl border border-neutral-100">
                      {item.description}
                    </p>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                      <span className="text-[10px] font-mono text-neutral-400 block uppercase">Scientist</span>
                      <span className="font-semibold text-neutral-900">{item.scientistName}</span>
                    </div>
                    <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                      <span className="text-[10px] font-mono text-neutral-400 block uppercase">Institution</span>
                      <span className="font-semibold text-neutral-900">{item.institution || '—'}</span>
                    </div>
                    <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                      <span className="text-[10px] font-mono text-neutral-400 block uppercase">Region / Topic</span>
                      <span className="font-semibold text-neutral-900">{item.region || '—'} / {item.researchTopic || '—'}</span>
                    </div>
                    <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                      <span className="text-[10px] font-mono text-neutral-400 block uppercase">Expedition / Year</span>
                      <span className="font-semibold text-neutral-900">{item.expedition || '—'} ({item.year || '—'})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Admin Rejection Modal */}
        {rejectingItem && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setRejectingItem(null)}
          >
            <div
              className="bg-white rounded-3xl border border-neutral-200 max-w-md w-full p-6 sm:p-8 shadow-2xl text-neutral-900 space-y-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Reject Scientific Submission
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">
                    "{rejectingItem.title}"
                  </p>
                </div>
                <button
                  onClick={() => setRejectingItem(null)}
                  className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Reason for Rejection * (Will be shown to the submitting scientist)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="e.g., The dataset link is inaccessible or lacks open geodetic validation data."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setRejectingItem(null)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingAction}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {processingAction ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rejecting...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Confirm Rejection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Removal Modal */}
        {removingItem && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setRemovingItem(null)}
          >
            <div
              className="bg-white rounded-3xl border border-neutral-200 max-w-md w-full p-6 sm:p-8 shadow-2xl text-neutral-900 space-y-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Remove Polar Content
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    This soft deletes the record and removes it from public POLARIS discovery.
                  </p>
                </div>
                <button
                  onClick={() => setRemovingItem(null)}
                  className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <span className="text-[10px] font-mono text-neutral-400 block uppercase">Selected Record</span>
                <span className="text-xs font-semibold text-neutral-800 line-clamp-2">{removingItem.title}</span>
              </div>

              <form onSubmit={handleAdminRemoveSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Removal Reason * (Required for audit log)
                  </label>
                  <textarea
                    value={adminRemovalReason}
                    onChange={(e) => setAdminRemovalReason(e.target.value)}
                    rows={3}
                    placeholder="e.g., Data retracted by institution or requested by lead scientist."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 transition-colors"
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
                    disabled={processingAction}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {processingAction ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <span>Confirm Removal</span>
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

export default AdminContentPage;

