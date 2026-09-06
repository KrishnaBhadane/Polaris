import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Compass,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMySubmissions } from '../services/content.service';
import type { IContentItem, ContentType } from '../types/content.types';

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
};

export const ScientistDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMySubmissions();
        setSubmissions(data || []);
      } catch (err: any) {
        setError(
          err.response?.data?.message || err.message || 'Failed to load submissions.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const totalCount = submissions.length;
  const publishedCount = submissions.filter((s) => s.status === 'PUBLISHED').length;
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED').length;

  const recentSubmissions = submissions.slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header: Scientist Name & Verified Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Verified Scientist</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              {user?.name || 'Researcher'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Manage your polar research intake, dataset publications, and dissemination workflows.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <Link
              to="/scientist/submissions"
              className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition-colors cursor-pointer shadow-sm"
            >
              View Submissions
            </Link>
            <Link
              to="/scientist/upload"
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Research</span>
            </Link>
          </div>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block tracking-wider">
              Total Submissions
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono">
              {loading ? '–' : totalCount}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block tracking-wider">
              Published
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono">
              {loading ? '–' : publishedCount}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block tracking-wider">
              Pending Review
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 font-mono">
              {loading ? '–' : pendingCount}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block tracking-wider">
              Rejected / Revision
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-neutral-400 font-mono">
              {loading ? '–' : rejectedCount}
            </div>
          </div>
        </div>

        {/* Recent Submissions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                Recent Submissions
              </h2>
              <p className="text-xs text-neutral-500">
                Latest research records submitted from your account
              </p>
            </div>

            {submissions.length > 0 && (
              <Link
                to="/scientist/submissions"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors inline-flex items-center space-x-1"
              >
                <span>View all ({totalCount})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 space-y-3 animate-pulse">
              <div className="h-4 bg-neutral-100 rounded w-1/3" />
              <div className="h-12 bg-neutral-50 rounded-xl w-full" />
              <div className="h-12 bg-neutral-50 rounded-xl w-full" />
            </div>
          ) : recentSubmissions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 sm:p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900">No submissions yet</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Get started by uploading your first polar expedition report, telemetry dataset, or field publication.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  to="/scientist/upload"
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload First Research Record</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden divide-y divide-neutral-100">
              {recentSubmissions.map((item) => {
                const statusStyle =
                  statusBadgeStyles[item.status || 'PENDING'] || statusBadgeStyles.PENDING;

                return (
                  <div
                    key={item._id}
                    className="p-4 sm:p-5 hover:bg-neutral-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                          {typeIcons[item.type]}
                          <span>{item.type}</span>
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {item.status || 'PENDING'}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                        {item.title}
                      </h4>

                      <div className="flex items-center space-x-3 text-[11px] text-neutral-500 font-mono">
                        {item.institution && <span>{item.institution}</span>}
                        {item.region && <span>• {item.region}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {item.status === 'PUBLISHED' && (
                        <>
                          <Link
                            to={`/content/${item._id}`}
                            className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 inline-flex items-center space-x-1 transition-colors"
                          >
                            <span>View Public</span>
                            <ExternalLink className="w-3 h-3 text-neutral-400" />
                          </Link>
                          <Link
                            to={`/outreach/${item._id}`}
                            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-medium inline-flex items-center space-x-1 transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-sky-600" />
                            <span>Outreach Studio</span>
                          </Link>
                        </>
                      )}

                      {item.status === 'PENDING' && (
                        <span className="text-xs text-amber-700 font-mono flex items-center space-x-1 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Under Review</span>
                        </span>
                      )}

                      {item.status === 'REJECTED' && (
                        <Link
                          to="/scientist/submissions"
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-medium inline-flex items-center space-x-1 transition-colors"
                        >
                          <span>Review Feedback</span>
                        </Link>
                      )}
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

export default ScientistDashboardPage;
