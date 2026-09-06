import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Search,
  Building,
  Mail,
  CreditCard,
  Compass,
  FileText,
  Clock,
  X,
  FileCheck
} from 'lucide-react';
import {
  getPendingScientistsAdmin,
  approveScientistAdmin,
  rejectScientistAdmin,
  getSignedIdProofUrlAdmin,
} from '../services/admin.service';

export const AdminScientistsPage: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rejection Modal State
  const [rejectingApp, setRejectingApp] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Document Viewing State
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const fetchPendingQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingScientistsAdmin();
      setApplications(data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load pending scientist queue.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingQueue();
  }, [fetchPendingQueue]);

  // Handle Approve
  const handleApprove = async (id: string, name: string) => {
    try {
      setApprovingId(id);
      setError(null);
      setSuccessMessage(null);
      const res = await approveScientistAdmin(id);
      if (res.success) {
        setSuccessMessage(`Scientist access approved for "${name}".`);
        await fetchPendingQueue();
      } else {
        setError(res.message || 'Failed to approve application.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to approve application.'
      );
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingApp) return;

    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejecting the application.');
      return;
    }

    try {
      setProcessingAction(true);
      setError(null);
      setSuccessMessage(null);
      const res = await rejectScientistAdmin(rejectingApp._id, rejectionReason.trim());
      if (res.success) {
        setSuccessMessage(`Application for "${rejectingApp.fullName}" rejected.`);
        setRejectingApp(null);
        setRejectionReason('');
        await fetchPendingQueue();
      } else {
        setError(res.message || 'Failed to reject application.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to reject application.'
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle View ID Proof Document (fetch signed URL for secure download)
  const handleViewIdProof = async (appId: string, fallbackUrl?: string) => {
    try {
      setLoadingDocId(appId);
      const res = await getSignedIdProofUrlAdmin(appId);
      if (res.success && res.signedUrl) {
        window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
      } else if (fallbackUrl && fallbackUrl.startsWith('http')) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        setError('Could not generate signed document URL.');
      }
    } catch (err: any) {
      if (fallbackUrl && fallbackUrl.startsWith('http')) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        setError(err.response?.data?.message || 'Unable to access ID proof document.');
      }
    } finally {
      setLoadingDocId(null);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.fullName?.toLowerCase().includes(q) ||
      app.officialEmail?.toLowerCase().includes(q) ||
      app.institution?.toLowerCase().includes(q) ||
      app.designation?.toLowerCase().includes(q) ||
      app.researchArea?.toLowerCase().includes(q) ||
      app.employeeOrScientistId?.toLowerCase().includes(q) ||
      app.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-sky-600 uppercase tracking-widest">
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>Administrative Oversight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Scientist Verification Queue
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Audit applicant credentials, verify institutional affiliations, and review signed ID documents.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={fetchPendingQueue}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              title="Refresh queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
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

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, institution, research area..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 shadow-xs transition-colors"
            />
          </div>

          <div className="text-xs font-mono text-neutral-500 self-end sm:self-center">
            Pending Reviews: <span className="font-bold text-neutral-900">{filteredApplications.length}</span>
          </div>
        </div>

        {/* Pending Applications List */}
        {loading ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 space-y-4 animate-pulse">
            <div className="h-4 bg-neutral-100 rounded w-1/4" />
            <div className="h-28 bg-neutral-50 rounded-2xl w-full" />
            <div className="h-28 bg-neutral-50 rounded-2xl w-full" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400 shadow-sm">
              <FileCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900">
                {applications.length === 0
                  ? 'Scientist approval queue is clear'
                  : 'No matching applications found'}
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {applications.length === 0
                  ? 'All scientist verification requests have been audited and resolved.'
                  : 'Try clearing your search query.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div
                key={app._id}
                className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-7 shadow-sm space-y-5 hover:border-neutral-300 transition-all"
              >
                {/* Card Top: Applicant Name & Verification Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                        {app.fullName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                        Pending Verification
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-neutral-500 font-mono">
                      <span>Account: {app.user?.email || 'N/A'}</span>
                      <span>&bull;</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleViewIdProof(app._id, app.idProofUrl)}
                      disabled={loadingDocId === app._id}
                      className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      {loadingDocId === app._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      <span>View ID Proof</span>
                    </button>

                    <button
                      onClick={() => setRejectingApp(app)}
                      disabled={processingAction}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(app._id, app.fullName)}
                      disabled={approvingId === app._id || processingAction}
                      className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      {approvingId === app._id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Approving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approve Access</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-0.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block flex items-center space-x-1">
                      <Building className="w-3 h-3 text-neutral-400" />
                      <span>Institution</span>
                    </span>
                    <span className="font-semibold text-neutral-900 block truncate">{app.institution}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-0.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block flex items-center space-x-1">
                      <Compass className="w-3 h-3 text-neutral-400" />
                      <span>Designation / Role</span>
                    </span>
                    <span className="font-semibold text-neutral-900 block truncate">{app.designation}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-0.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block flex items-center space-x-1">
                      <FileText className="w-3 h-3 text-neutral-400" />
                      <span>Research Area</span>
                    </span>
                    <span className="font-semibold text-neutral-900 block truncate">{app.researchArea}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-0.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block flex items-center space-x-1">
                      <Mail className="w-3 h-3 text-neutral-400" />
                      <span>Official Email</span>
                    </span>
                    <span className="font-semibold text-neutral-900 block truncate">{app.officialEmail}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-0.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block flex items-center space-x-1">
                      <CreditCard className="w-3 h-3 text-neutral-400" />
                      <span>Employee / Scientist ID</span>
                    </span>
                    <span className="font-semibold text-neutral-900 block truncate">{app.employeeOrScientistId}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-0.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block">Document Reference</span>
                    <span className="font-mono text-[11px] text-neutral-600 truncate block">
                      {app.idProofPublicId || app.idProofUrl || 'Signed Cloudinary Asset'}
                    </span>
                  </div>
                </div>

                {/* Bio (if provided) */}
                {app.bio && (
                  <div className="p-3.5 rounded-2xl bg-neutral-50/50 border border-neutral-100 text-xs text-neutral-700">
                    <span className="font-semibold text-neutral-900 block mb-0.5">Research Statement / Background:</span>
                    <p className="leading-relaxed">{app.bio}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {rejectingApp && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setRejectingApp(null)}
          >
            <div
              className="bg-white rounded-3xl border border-neutral-200 max-w-md w-full p-6 sm:p-8 shadow-2xl text-neutral-900 space-y-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Reject Scientist Application
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    For applicant: {rejectingApp.fullName} ({rejectingApp.officialEmail})
                  </p>
                </div>
                <button
                  onClick={() => setRejectingApp(null)}
                  className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Reason for Rejection * (Will be shown to the applicant)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="e.g., Institutional accreditation document is unreadable. Please re-upload a clear official letterhead or ID pass."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setRejectingApp(null)}
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
      </div>
    </div>
  );
};

export default AdminScientistsPage;
