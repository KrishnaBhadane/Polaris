import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ArrowRight,
  RefreshCw,
  Building,
  Mail,
  User,
  Compass,
  CreditCard,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getScientistStatus,
  uploadScientistIdProof,
  applyScientist,
} from '../services/scientist.service';
import type {
  ScientistVerificationStatus,
  ScientistApplicationData,
  IdProofUploadResponse,
} from '../types/scientist.types';

export const ScientistApplyPage: React.FC = () => {
  const { user, authenticated, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Status State
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<ScientistVerificationStatus | null>(null);
  const [applicationData, setApplicationData] = useState<ScientistApplicationData | null>(null);
  const [isReapplying, setIsReapplying] = useState<boolean>(false);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [researchArea, setResearchArea] = useState<string>('');
  const [officialEmail, setOfficialEmail] = useState<string>('');
  const [employeeOrScientistId, setEmployeeOrScientistId] = useState<string>('');
  const [bio, setBio] = useState<string>('');

  // ID Proof Upload State
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofMeta, setIdProofMeta] = useState<IdProofUploadResponse | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submit State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Redirect if already scientist
  useEffect(() => {
    if (user && user.role === 'SCIENTIST') {
      navigate('/scientist/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Load Status
  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await getScientistStatus();
      if (res.success) {
        setHasApplied(res.hasApplied);
        setVerificationStatus(res.status);
        setApplicationData(res.application);

        if (res.application) {
          setFullName(res.application.fullName || user?.name || '');
          setInstitution(res.application.institution || '');
          setDesignation(res.application.designation || '');
          setResearchArea(res.application.researchArea || '');
          setOfficialEmail(res.application.officialEmail || '');
          setEmployeeOrScientistId(res.application.employeeOrScientistId || '');
          setBio(res.application.bio || '');
        } else if (user) {
          setFullName(user.name || '');
        }
      }
    } catch {
      // Fallback
      if (user) {
        setFullName(user.name || '');
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchStatus();
    }
  }, [authenticated]);

  // Handle File Selection & Auto-Upload to /api/scientist/id-proof
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5 MB limit.');
      return;
    }

    // Validate format (jpg, jpeg, png, pdf)
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type.toLowerCase()) && !/\.(jpg|jpeg|png|pdf)$/i.test(file.name)) {
      setUploadError('Invalid file format. Please upload JPG, PNG, or PDF.');
      return;
    }

    setUploadError(null);
    setIdProofFile(file);
    setUploadingFile(true);

    try {
      const res = await uploadScientistIdProof(file);
      if (res.success) {
        setIdProofMeta(res);
      } else {
        setUploadError(res.message || 'Failed to securely upload ID proof.');
      }
    } catch (err: any) {
      setUploadError(
        err.response?.data?.message || err.message || 'Failed to upload verification document.'
      );
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!fullName.trim() || !institution.trim() || !designation.trim() || !researchArea.trim() || !officialEmail.trim() || !employeeOrScientistId.trim()) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    const publicId = idProofMeta?.publicId || applicationData?.idProofPublicId || applicationData?.idProofUrl;
    if (!publicId) {
      setSubmitError('Please upload your institutional ID proof document.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await applyScientist({
        fullName: fullName.trim(),
        institution: institution.trim(),
        designation: designation.trim(),
        researchArea: researchArea.trim(),
        officialEmail: officialEmail.trim().toLowerCase(),
        employeeOrScientistId: employeeOrScientistId.trim(),
        idProofPublicId: publicId,
        idProofResourceType: idProofMeta?.resourceType,
        idProofFormat: idProofMeta?.format,
        idProofDeliveryType: idProofMeta?.deliveryType,
        bio: bio.trim(),
      });

      if (res.success) {
        setSubmitSuccess('Application submitted successfully! It is now pending administrative verification.');
        setIsReapplying(false);
        await fetchStatus();
        await refreshUser();
      } else {
        setSubmitError(res.message || 'Failed to submit application.');
      }
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || err.message || 'Failed to submit application.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center">
        <div className="flex items-center space-x-2 text-xs font-mono text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
          <span>Verifying researcher status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="space-y-1 pb-4 border-b border-neutral-100">
          <div className="flex items-center space-x-2 text-xs font-semibold text-sky-600 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
            <span>Polar Research Credentialing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Apply as Scientist
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-xl">
            Verified scientists can publish expedition reports, telemetry datasets, field imagery, and launch AI outreach workflows.
          </p>
        </div>

        {/* 1. STATUS: PENDING */}
        {hasApplied && verificationStatus === 'PENDING' && !isReapplying && (
          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-800 uppercase tracking-wider">
                    Verification Pending
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 mt-1">
                    Your scientist application is under review.
                  </h2>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Our administrative team verifies official institutional credentials within 24–48 hours.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchStatus}
                className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-100/50 text-xs font-semibold text-amber-900 inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Check Status</span>
              </button>
            </div>

            {applicationData && (
              <div className="p-4 rounded-2xl bg-white border border-amber-100/80 text-xs space-y-2 text-neutral-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block">Institution</span>
                    <span className="font-semibold text-neutral-900">{applicationData.institution}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block">Designation</span>
                    <span className="font-semibold text-neutral-900">{applicationData.designation}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block">Research Area</span>
                    <span className="font-semibold text-neutral-900">{applicationData.researchArea}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-neutral-400 uppercase block">Official Email</span>
                    <span className="font-semibold text-neutral-900">{applicationData.officialEmail}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-amber-200/50 text-xs text-neutral-500">
              <span>Submitted on {applicationData?.createdAt ? new Date(applicationData.createdAt).toLocaleDateString() : 'recently'}</span>
              <Link to="/explore" className="text-sky-600 hover:text-sky-700 font-semibold">
                Explore Public Research →
              </Link>
            </div>
          </div>
        )}

        {/* 2. STATUS: APPROVED */}
        {hasApplied && verificationStatus === 'APPROVED' && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 sm:p-8 space-y-5 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 uppercase tracking-wider">
                Scientist Access Approved
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mt-2">
                Welcome to the POLARIS Scientist Network
              </h2>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                Your credentials are fully verified. You can now publish research, upload datasets, and manage scientific submissions.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/scientist/dashboard"
                className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors shadow-sm"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* 3. STATUS: REJECTED (Notice Box) */}
        {hasApplied && verificationStatus === 'REJECTED' && !isReapplying && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-200 text-rose-800 uppercase tracking-wider">
                  Application Rejected
                </span>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  Scientist Application Not Approved
                </h2>
                {applicationData?.rejectionReason && (
                  <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs text-rose-800 mt-2">
                    <span className="font-semibold block text-[11px] text-neutral-500 uppercase font-mono">Reason for decision:</span>
                    <p className="mt-0.5 font-medium">{applicationData.rejectionReason}</p>
                  </div>
                )}
                <p className="text-xs text-neutral-600 pt-1">
                  You can revise your institutional details or upload a clearer ID document and re-submit.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setIsReapplying(true)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <span>Re-Apply / Update Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 4. FORM: NOT APPLIED or RE-APPLYING */}
        {(!hasApplied || isReapplying) && (
          <form onSubmit={handleSubmit} className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            {submitSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Full Legal Name *</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Institution */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                  <Building className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Institution / University *</span>
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="National Centre for Polar and Ocean Research (NCPOR)"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Designation */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                  <Compass className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Designation / Role *</span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Senior Scientist / Project Director"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Research Area */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Research Area / Domain *</span>
                </label>
                <input
                  type="text"
                  value={researchArea}
                  onChange={(e) => setResearchArea(e.target.value)}
                  placeholder="Cryospheric Dynamics, Paleoclimate, Oceanography"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Official Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Official / Institutional Email *</span>
                </label>
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="scientist@ncpor.res.in"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Employee ID */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Scientist / Employee ID *</span>
                </label>
                <input
                  type="text"
                  value={employeeOrScientistId}
                  onChange={(e) => setEmployeeOrScientistId(e.target.value)}
                  placeholder="NCPOR-SCI-2024-89"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Optional Bio */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-800 block">
                Research Background / Expeditions (Optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Brief summary of polar expedition history, stations visited, or research focus..."
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />
            </div>

            {/* ID Proof Document Upload */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800 block">
                  Institutional ID Proof Document * (JPG, JPEG, PNG, PDF, max 5 MB)
                </label>
                <span className="text-[11px] font-mono text-neutral-400">Authenticated Storage</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 hover:bg-neutral-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 shadow-sm shrink-0">
                      <Upload className="w-4 h-4 text-sky-600" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">
                        {idProofFile ? idProofFile.name : 'Upload Official ID / Accreditation Card'}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {idProofFile
                          ? `${(idProofFile.size / 1024 / 1024).toFixed(2)} MB`
                          : 'Institutional ID, Department Letter, or Expedition Pass'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {uploadingFile ? (
                      <div className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold flex items-center space-x-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        <span>Uploading...</span>
                      </div>
                    ) : idProofMeta ? (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-200">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Document Verified</span>
                      </div>
                    ) : (
                      <label className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
              {isReapplying && (
                <button
                  type="button"
                  onClick={() => setIsReapplying(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application for Verification</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScientistApplyPage;
