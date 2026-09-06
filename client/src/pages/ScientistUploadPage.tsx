import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  BookOpen,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Plus,
  X,
  Link2,
  Check
} from 'lucide-react';
import { uploadScientificFile, uploadThumbnailFile } from '../services/upload.service';
import { createContent } from '../services/content.service';
import type { ContentType } from '../types/content.types';

const contentTypes: {
  type: ContentType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'REPORT',
    label: 'Report',
    desc: 'PDF scientific or expedition report',
    icon: <FileText className="w-4 h-4 text-sky-600" />,
  },
  {
    type: 'PUBLICATION',
    label: 'Publication',
    desc: 'Peer-reviewed paper or monograph',
    icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
  },
  {
    type: 'DATASET',
    label: 'Dataset',
    desc: 'External repository / NPDC / DOI',
    icon: <Database className="w-4 h-4 text-emerald-600" />,
  },
  {
    type: 'IMAGE',
    label: 'Imagery',
    desc: 'Satellite or field photography',
    icon: <ImageIcon className="w-4 h-4 text-purple-600" />,
  },
  {
    type: 'VIDEO',
    label: 'Video',
    desc: 'Expedition video or stream URL',
    icon: <VideoIcon className="w-4 h-4 text-rose-600" />,
  },
  {
    type: 'ACTIVITY',
    label: 'Activity',
    desc: 'Field deployment or telemetry log',
    icon: <Compass className="w-4 h-4 text-amber-600" />,
  },
];

export const ScientistUploadPage: React.FC = () => {
  // Mode / Type Selection
  const [selectedType, setSelectedType] = useState<ContentType>('REPORT');

  // Common Fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [region, setRegion] = useState<string>('Antarctica');
  const [expedition, setExpedition] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [researchTopic, setResearchTopic] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>(['Polar Research', 'Antarctica']);

  // Type Specific: File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Type Specific: Video Mode & External URL
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState<boolean>(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);

  // Form State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submittedTitle, setSubmittedTitle] = useState<string>('');

  // Add Keyword tag
  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = keywordInput.trim().replace(/^,|,$/g, '');
      if (val && !keywords.includes(val)) {
        setKeywords([...keywords, val]);
        setKeywordInput('');
      }
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter((kw) => kw !== kwToRemove));
  };

  // Handle File Selection and Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploadError(null);
    setSelectedFile(file);
    setUploadedFileUrl('');
    setUploadingFile(true);

    try {
      const res = await uploadScientificFile(file, selectedType);
      if (res.success && res.fileUrl) {
        setUploadedFileUrl(res.fileUrl);
      } else {
        setFileUploadError(res.message || 'File upload failed. Please try again.');
      }
    } catch (err: any) {
      setFileUploadError(
        err.response?.data?.message || err.message || 'Failed to upload research file.'
      );
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle Optional Thumbnail Selection and Upload (DATASET, REPORT, PUBLICATION, ACTIVITY, VIDEO)
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailUploadError(null);

    // Validate MIME type & file extension (JPG, JPEG, PNG, WEBP)
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExt = /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    if (!validMimes.includes(file.type.toLowerCase()) && !validExt) {
      setThumbnailUploadError('Thumbnail must be a valid image file (JPG, JPEG, PNG, or WEBP).');
      return;
    }

    // Validate size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      setThumbnailUploadError('Thumbnail file size exceeds the 5 MB limit.');
      return;
    }

    setThumbnailUrl('');
    setUploadingThumbnail(true);

    try {
      const res = await uploadThumbnailFile(file);
      if (res.success && res.fileUrl) {
        setThumbnailUrl(res.fileUrl);
      } else {
        setThumbnailUploadError(res.message || 'Thumbnail upload failed. Please try again.');
      }
    } catch (err: any) {
      setThumbnailUploadError(
        err.response?.data?.message || err.message || 'Failed to upload thumbnail.'
      );
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Reset form to upload another item
  const handleResetForm = () => {
    setIsSuccess(false);
    setTitle('');
    setDescription('');
    setInstitution('');
    setRegion('Antarctica');
    setExpedition('');
    setYear(new Date().getFullYear());
    setResearchTopic('');
    setKeywords(['Polar Research', 'Antarctica']);
    setSelectedFile(null);
    setUploadedFileUrl('');
    setExternalUrl('');
    setThumbnailUrl('');
    setThumbnailUploadError(null);
    setSubmitError(null);
  };

  // Handle Submit Metadata to /api/content
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim() || !description.trim()) {
      setSubmitError('Title and description are required.');
      return;
    }

    if (keywords.length === 0) {
      setSubmitError('Please provide at least one keyword for research classification.');
      return;
    }

    // Type specific validations
    if ((selectedType === 'REPORT' || selectedType === 'PUBLICATION' || selectedType === 'IMAGE') && !uploadedFileUrl) {
      setSubmitError(`Please upload a valid ${selectedType.toLowerCase()} file.`);
      return;
    }

    if (selectedType === 'DATASET' && !externalUrl.trim()) {
      setSubmitError('Please provide an external repository URL, DOI, or NPDC link for datasets.');
      return;
    }

    if (selectedType === 'VIDEO') {
      if (videoInputMode === 'upload' && !uploadedFileUrl) {
        setSubmitError('Please upload a video file or switch to external video URL.');
        return;
      }
      if (videoInputMode === 'url' && !externalUrl.trim()) {
        setSubmitError('Please enter a valid video streaming or repository URL.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await createContent({
        title: title.trim(),
        description: description.trim(),
        type: selectedType,
        institution: institution.trim() || undefined,
        region: region.trim() || undefined,
        expedition: expedition.trim() || undefined,
        year: Number(year) || undefined,
        researchTopic: researchTopic.trim() || undefined,
        keywords,
        fileUrl: uploadedFileUrl || undefined,
        externalUrl: externalUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
      });

      if (res.success) {
        setSubmittedTitle(title.trim());
        setIsSuccess(true);
      } else {
        setSubmitError(res.message || 'Failed to submit scientific content.');
      }
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || err.message || 'Failed to submit scientific content.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1 pb-4 border-b border-neutral-100">
          <div className="flex items-center space-x-2 text-xs font-semibold text-sky-600 uppercase tracking-widest">
            <Upload className="w-3.5 h-3.5 text-sky-500" />
            <span>Research Intake Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Upload Scientific Content
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-xl">
            Submit new polar reports, datasets, publications, or field records. Submissions are queued for administrative verification before publication.
          </p>
        </div>

        {/* Success Confirmation State */}
        {isSuccess ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-8 sm:p-12 text-center space-y-5 shadow-sm animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200 text-emerald-900 uppercase tracking-wider">
                Submitted for Review
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-2">
                "{submittedTitle}"
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
                Your submission will become public after admin approval. You can track peer review and verification status in your submissions manager.
              </p>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/scientist/submissions"
                className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors shadow-sm"
              >
                <span>View Submissions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Another</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* 1. Compact Content Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-800 block">
                Select Content Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {contentTypes.map((item) => {
                  const isSelected = selectedType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.type);
                        setSelectedFile(null);
                        setUploadedFileUrl('');
                        setFileUploadError(null);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-1 ring-sky-500/20'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {item.icon}
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block leading-tight">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-neutral-500 line-clamp-1">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Common Metadata Details Container */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-5 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                Research Metadata
              </h3>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-800 block">
                    Research Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Larsemann Hills Cryospheric Ice Core Telemetry & Isotope Analysis"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-800 block">
                    Abstract / Summary Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide a scientific abstract, observational methodology, and key polar research findings..."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* 4 Metadata Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-800 block">
                      Region / Sector
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                    >
                      <option value="Antarctica">Antarctica (Maitri / Bharati)</option>
                      <option value="Arctic">Arctic (Himadri / Svalbard)</option>
                      <option value="Southern Ocean">Southern Ocean</option>
                      <option value="Himalayas">Himalayas (Cryosphere)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-800 block">
                      Expedition / Season
                    </label>
                    <input
                      type="text"
                      value={expedition}
                      onChange={(e) => setExpedition(e.target.value)}
                      placeholder="43rd ISEA"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-800 block">
                      Year
                    </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      min={1980}
                      max={2030}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-800 block">
                      Research Topic
                    </label>
                    <input
                      type="text"
                      value={researchTopic}
                      onChange={(e) => setResearchTopic(e.target.value)}
                      placeholder="Glaciology / Climate"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Institution Override */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-800 block">
                    Institution (Leave blank to use verified profile default)
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="National Centre for Polar and Ocean Research (NCPOR)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                {/* Keywords Tag Manager */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-800 block">
                    Scientific Keywords * (Press Enter or comma to add)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-neutral-200 bg-neutral-50/50">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-800 shadow-2xs"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleAddKeyword}
                      placeholder={keywords.length === 0 ? "Add keyword..." : ""}
                      className="flex-1 min-w-[120px] bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none px-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Type-Specific Artifact & File Intake Container */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3 flex items-center justify-between">
                <span>{selectedType} Resource Payload</span>
                <span className="text-[11px] font-mono text-neutral-400 font-normal">
                  {selectedType === 'DATASET' ? 'External Repository Link' : 'File Upload'}
                </span>
              </h3>

              {/* REPORT & PUBLICATION: PDF Upload */}
              {(selectedType === 'REPORT' || selectedType === 'PUBLICATION') && (
                <div className="p-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-neutral-900">
                          {selectedFile ? selectedFile.name : `Upload Official ${selectedType === 'PUBLICATION' ? 'Publication' : 'Report'} PDF`}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {selectedFile
                            ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                            : 'Standard PDF document up to 20 MB'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {uploadingFile ? (
                        <div className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold flex items-center space-x-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                          <span>Uploading PDF...</span>
                        </div>
                      ) : uploadedFileUrl ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PDF Uploaded</span>
                        </div>
                      ) : (
                        <label className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm">
                          <Upload className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Select PDF</span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {fileUploadError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{fileUploadError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* IMAGE: Image Upload */}
              {selectedType === 'IMAGE' && (
                <div className="p-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-neutral-900">
                          {selectedFile ? selectedFile.name : 'Upload Polar Satellite or Field Photo'}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {selectedFile
                            ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                            : 'JPG, JPEG, PNG, WEBP up to 10 MB'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {uploadingFile ? (
                        <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold flex items-center space-x-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                          <span>Uploading Image...</span>
                        </div>
                      ) : uploadedFileUrl ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Image Ready</span>
                        </div>
                      ) : (
                        <label className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm">
                          <Upload className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Choose Image</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {fileUploadError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{fileUploadError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* DATASET: External Repository Link Only (No file upload) */}
              {selectedType === 'DATASET' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-800 space-y-1">
                    <span className="font-semibold block">Dataset Repository Link Required:</span>
                    <p className="text-neutral-600">
                      POLARIS indexes and federates polar scientific datasets via DOI, NPDC, NASA Earthdata, or institutional repositories.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                      <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dataset URL / DOI Link *</span>
                    </label>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://doi.org/10.5067/NPDC/POLARIS-2024 or https://npdc.ncpor.res.in/..."
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* VIDEO: Upload Video OR External Video Link */}
              {selectedType === 'VIDEO' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-neutral-100 pb-2">
                    <button
                      type="button"
                      onClick={() => setVideoInputMode('upload')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        videoInputMode === 'upload'
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Upload Video File
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoInputMode('url')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        videoInputMode === 'url'
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      External Video URL
                    </button>
                  </div>

                  {videoInputMode === 'upload' ? (
                    <div className="p-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                            <VideoIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-neutral-900">
                              {selectedFile ? selectedFile.name : 'Upload Video File (.mp4, .webm)'}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              {selectedFile
                                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                                : 'MP4 or WebM up to 100 MB'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {uploadingFile ? (
                            <div className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                              <span>Uploading Video...</span>
                            </div>
                          ) : uploadedFileUrl ? (
                            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Video Ready</span>
                            </div>
                          ) : (
                            <label className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm">
                              <Upload className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Select Video</span>
                              <input
                                type="file"
                                accept="video/mp4,video/webm,.mp4,.webm"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {fileUploadError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center space-x-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{fileUploadError}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1">
                        <Link2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>External Video Stream URL *</span>
                      </label>
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... or streaming URL"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITY: Metadata Field Summary */}
              {selectedType === 'ACTIVITY' && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-xs text-amber-900 space-y-1">
                  <span className="font-semibold block">Field Expedition Activity:</span>
                  <p className="text-neutral-600">
                    Activity records document field deployments, station instrument calibrations, and polar expeditions. No external file upload is required unless you provide an optional reference link below.
                  </p>
                  <div className="pt-2">
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="Optional reference repository / field log link..."
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* Optional Thumbnail for DATASET, REPORT, PUBLICATION, ACTIVITY, VIDEO */}
              {selectedType !== 'IMAGE' && (
                <div className="pt-4 border-t border-neutral-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Thumbnail (optional)</span>
                      </label>
                      <p className="text-[11px] text-neutral-500">
                        JPG, JPEG, PNG, or WEBP up to 5 MB. If omitted, a clean polar fallback visual will be used.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {uploadingThumbnail ? (
                        <div className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold flex items-center space-x-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                          <span>Uploading...</span>
                        </div>
                      ) : thumbnailUrl ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-200 shrink-0 bg-neutral-100">
                            <img
                              src={thumbnailUrl}
                              alt="Thumbnail preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center space-x-1 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Uploaded</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setThumbnailUrl('');
                            }}
                            className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                            title="Remove thumbnail"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Choose Thumbnail</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                            onChange={handleThumbnailChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {thumbnailUploadError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{thumbnailUploadError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submission Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
              <Link
                to="/scientist/dashboard"
                className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold"
              >
                Back to Dashboard
              </Link>

              <button
                type="submit"
                disabled={submitting || uploadingFile || uploadingThumbnail}
                className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Content...</span>
                  </>
                ) : (
                  <>
                    <span>Submit for Administrative Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScientistUploadPage;
