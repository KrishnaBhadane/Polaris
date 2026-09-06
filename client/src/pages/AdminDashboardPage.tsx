import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  FileCheck,
  Megaphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Plus,
  Power,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export interface IAdminMarqueeNewsItem {
  _id: string;
  textEn: string;
  textHi: string;
  enabled: boolean;
  createdAt: string;
  expiresAt: string;
  createdBy?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

function formatRemainingTime(expiresAtStr: string): { label: string; isExpired: boolean } {
  const expiresAt = new Date(expiresAtStr).getTime();
  const now = Date.now();
  const diffMs = expiresAt - now;

  if (diffMs <= 0) {
    return { label: 'Expired', isExpired: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return { label: `Expires in ${hours}h ${mins}m`, isExpired: false };
  }
  return { label: `Expires in ${mins}m`, isExpired: false };
}

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // News State
  const [newsList, setNewsList] = useState<IAdminMarqueeNewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State
  const [newTextEn, setNewTextEn] = useState<string>('');
  const [newTextHi, setNewTextHi] = useState<string>('');
  const [newEnabled, setNewEnabled] = useState<boolean>(true);

  // Messages
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: IAdminMarqueeNewsItem[] }>(
        '/admin/marquee-news'
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        setNewsList(res.data.data);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to load news announcements.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextEn.trim()) {
      setErrorMsg('Please enter the English announcement text.');
      return;
    }

    setCreating(true);
    setFeedbackMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.post<{ success: boolean; message: string; data: IAdminMarqueeNewsItem }>(
        '/admin/marquee-news',
        {
          textEn: newTextEn.trim(),
          textHi: newTextHi.trim(),
          enabled: newEnabled,
        }
      );

      if (res.data?.success) {
        setFeedbackMsg('New announcement posted successfully (expires in 24 hours).');
        setNewTextEn('');
        setNewTextHi('');
        setNewEnabled(true);
        await fetchNews();
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to create announcement.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleToggleEnabled = async (item: IAdminMarqueeNewsItem) => {
    setActionLoadingId(item._id);
    setErrorMsg(null);
    try {
      const res = await api.patch<{ success: boolean; data: IAdminMarqueeNewsItem }>(
        `/admin/marquee-news/${item._id}`,
        { enabled: !item.enabled }
      );
      if (res.data?.success) {
        setNewsList((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, enabled: !item.enabled } : n))
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to update announcement.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently remove this announcement?')) {
      return;
    }

    setActionLoadingId(id);
    setErrorMsg(null);
    try {
      const res = await api.delete<{ success: boolean; message: string }>(
        `/admin/marquee-news/${id}`
      );
      if (res.data?.success) {
        setNewsList((prev) => prev.filter((n) => n._id !== id));
        setFeedbackMsg('Announcement removed.');
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to remove announcement.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 bg-white text-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="flex items-center space-x-2 text-xs text-sky-600 font-semibold uppercase tracking-wider mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('admin.console', 'Administration Console')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          {t('admin.title', 'System Administration')}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          {t('admin.subtitle', 'Supervisory control center for administrators')} &bull;{' '}
          <span className="font-mono text-neutral-700">{user?.email}</span>
        </p>
      </div>

      {/* Admin Quick Link Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/scientists"
          className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm hover:border-sky-400 hover:shadow-md transition-all space-y-3 block group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">
            {t('admin.scientistsCardTitle', 'Scientist Verifications')}
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t(
              'admin.scientistsCardDesc',
              'Review pending researcher applications, inspect encrypted credentials, approve or reject.'
            )}
          </p>
        </Link>

        <Link
          to="/admin/content"
          className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm hover:border-sky-400 hover:shadow-md transition-all space-y-3 block group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">
            {t('admin.contentCardTitle', 'Content Moderation')}
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t(
              'admin.contentCardDesc',
              'Review pending scientific publications, reports, datasets, and manage published records.'
            )}
          </p>
        </Link>
      </div>

      {/* Admin News & Updates Section (Multi-News System) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-50/60 border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {t('admin.newsTitle', 'News & Updates')}
              </h2>
              <p className="text-xs text-neutral-500">
                {t(
                  'admin.newsSubtitle',
                  'Post temporary announcements on the homepage marquee (auto-expires in 24 hours).'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {feedbackMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Add Announcement Form */}
        <form onSubmit={handleCreateNews} className="p-5 rounded-2xl bg-white border border-neutral-200 space-y-4 shadow-xs">
          <div className="flex items-center space-x-2 text-xs font-bold text-neutral-800 uppercase tracking-wider">
            <Plus className="w-4 h-4 text-sky-600" />
            <span>Post New Announcement</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* English Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800">
                  {t('admin.englishText', 'English Announcement')} *
                </label>
                <span className="text-[11px] font-mono text-neutral-400">
                  {newTextEn.length} / 180 chars
                </span>
              </div>
              <input
                type="text"
                value={newTextEn}
                onChange={(e) => setNewTextEn(e.target.value)}
                maxLength={180}
                required
                placeholder="e.g. 45th Antarctic Expedition applications are open"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-neutral-50/50 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 focus:bg-white transition-all"
              />
            </div>

            {/* Hindi Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800">
                  {t('admin.hindiText', 'Hindi Announcement (optional)')}
                </label>
                <span className="text-[11px] font-mono text-neutral-400">
                  {newTextHi.length} / 180 chars
                </span>
              </div>
              <input
                type="text"
                value={newTextHi}
                onChange={(e) => setNewTextHi(e.target.value)}
                maxLength={180}
                placeholder="उदा. 45वें भारतीय अंटार्कटिक अभियान के लिए आवेदन खुले हैं"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-neutral-50/50 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Enable Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newEnabled}
                onChange={(e) => setNewEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500"></div>
              <span className="ml-2.5 text-xs font-medium text-neutral-700">
                Active immediately
              </span>
            </label>

            <button
              type="submit"
              disabled={creating || !newTextEn.trim()}
              className="ice-crystal-btn px-5 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Announcement (24h)</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 2. Active & Existing Announcements List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-mono">
              Existing Announcements ({newsList.length})
            </h3>
            {hasActiveNewsText(newsList) ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ● Live on Marquee (News Only Mode)
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                Marquee showing default POLARIS features
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center space-x-2 text-xs text-neutral-500 py-8">
              <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              <span>Loading announcements...</span>
            </div>
          ) : newsList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-neutral-200 text-xs text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-700">No active announcements.</p>
              <p className="text-neutral-400">
                The homepage marquee will automatically display default POLARIS feature items.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {newsList.map((item) => {
                const { label: expiryLabel, isExpired } = formatRemainingTime(item.expiresAt);
                const isItemActionLoading = actionLoadingId === item._id;

                return (
                  <div
                    key={item._id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !item.enabled
                        ? 'bg-neutral-50/80 border-neutral-200 opacity-60'
                        : isExpired
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-white border-neutral-200 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-neutral-900">
                          {item.textEn}
                        </span>
                        {!item.enabled ? (
                          <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full">
                            DISABLED
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {item.textHi && (
                        <p className="text-[11px] text-neutral-500">
                          <span className="font-semibold font-mono text-[10px] text-neutral-400 mr-1">HI:</span>
                          {item.textHi}
                        </p>
                      )}

                      <div className="flex items-center space-x-3 text-[11px] text-neutral-400 pt-0.5 font-mono">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span className={isExpired ? 'text-amber-600 font-semibold' : 'text-neutral-600'}>
                            {expiryLabel}
                          </span>
                        </span>
                        <span>&bull;</span>
                        <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action Controls: Enable/Disable & Remove */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(item)}
                        disabled={isItemActionLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center space-x-1 transition-colors cursor-pointer border ${
                          item.enabled
                            ? 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                        title={item.enabled ? 'Disable announcement' : 'Enable announcement'}
                      >
                        <Power className="w-3 h-3" />
                        <span>{item.enabled ? 'Disable' : 'Enable'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteNews(item._id)}
                        disabled={isItemActionLoading}
                        className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function hasActiveNewsText(list: IAdminMarqueeNewsItem[]): boolean {
  const now = Date.now();
  return list.some((item) => item.enabled && new Date(item.expiresAt).getTime() > now);
}

export default AdminDashboardPage;
