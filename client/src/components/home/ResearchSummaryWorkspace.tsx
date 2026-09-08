import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  X,
  Sparkles,
  Zap,
  BookOpen,
  Cpu,
  Info,
  ArrowRight,
  ArrowUp,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { OutreachStudioWorkspace } from './OutreachStudioWorkspace';
import {
  generateWorkspaceSummaryApi,
  type SummaryMode,
  type AILanguage,
} from '../../services/ai.service';

type InputType = 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK';
type SummaryTab = 'QUICK' | 'STUDENT' | 'TECHNICAL';
type WorkspaceMode = 'SUMMARY' | 'OUTREACH';

export const ResearchSummaryWorkspace: React.FC = () => {
  const { user, authenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role Access Check: Only SCIENTIST can access Outreach Studio
  const canAccessOutreach = Boolean(
    authenticated && user?.role === 'SCIENTIST'
  );

  const initialTab =
    searchParams.get('tab') === 'outreach' && canAccessOutreach ? 'OUTREACH' : 'SUMMARY';
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialTab);

  // Language state (default from i18n)
  const defaultLang: AILanguage = i18n.language?.startsWith('hi') ? 'HI' : 'EN';
  const [language, setLanguage] = useState<AILanguage>(defaultLang);

  useEffect(() => {
    const current = i18n.language?.startsWith('hi') ? 'HI' : 'EN';
    setLanguage(current);
  }, [i18n.language]);

  // Sync with searchParams if tab parameter changes or if user role restricts it
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'outreach' && canAccessOutreach) {
      setWorkspaceMode('OUTREACH');
      requestAnimationFrame(() => {
        const el = document.getElementById('summary-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else if (tab === 'outreach' && !canAccessOutreach) {
      setWorkspaceMode('SUMMARY');
      setSearchParams((prev) => {
        prev.delete('tab');
        return prev;
      });
    }
  }, [searchParams, canAccessOutreach, setSearchParams]);

  const handleModeChange = (mode: WorkspaceMode) => {
    if (mode === 'OUTREACH' && !canAccessOutreach) return;
    setWorkspaceMode(mode);
    setSearchParams((prev) => {
      if (mode === 'OUTREACH') {
        prev.set('tab', 'outreach');
      } else {
        prev.delete('tab');
        prev.delete('contentId');
      }
      return prev;
    });
  };

  const [activeMode, setActiveMode] = useState<'FILE' | 'LINK'>('FILE');
  const [selectedType, setSelectedType] = useState<InputType>('PDF');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkInput, setLinkInput] = useState<string>('');
  const [linkCommitted, setLinkCommitted] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SummaryTab>('QUICK');

  // Result & Error State
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<{
    inputType: InputType;
    mode: SummaryTab;
    language: AILanguage;
    source: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const determineFileType = (file: File): InputType => {
    if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) return 'PDF';
    if (file.type.startsWith('image/')) return 'IMAGE';
    if (file.type.startsWith('video/')) return 'VIDEO';
    return 'PDF';
  };

  const validateFileSize = (file: File, type: InputType): string | null => {
    if (type === 'PDF' && file.size > 20 * 1024 * 1024) {
      return 'PDF file size exceeds maximum limit of 20MB.';
    }
    if (type === 'IMAGE' && file.size > 10 * 1024 * 1024) {
      return 'Image file size exceeds maximum limit of 10MB.';
    }
    if (type === 'VIDEO' && file.size > 25 * 1024 * 1024) {
      return 'Video file size exceeds maximum limit of 25MB for workspace analysis.';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const type = determineFileType(file);
      const sizeErr = validateFileSize(file, type);
      if (sizeErr) {
        setErrorMsg(sizeErr);
        return;
      }
      setErrorMsg(null);
      setSelectedFile(file);
      setSelectedType(type);
      setLinkInput('');
      setLinkCommitted(false);
      setSummaryResult(null);
      setSummaryMeta(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const type = determineFileType(file);
      const sizeErr = validateFileSize(file, type);
      if (sizeErr) {
        setErrorMsg(sizeErr);
        return;
      }
      setErrorMsg(null);
      setSelectedFile(file);
      setSelectedType(type);
      setLinkInput('');
      setLinkCommitted(false);
      setSummaryResult(null);
      setSummaryMeta(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Keyboard shortcut listener for pasting links when window is active
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const text = e.clipboardData?.getData('text');
      if (
        text &&
        (text.startsWith('http://') ||
          text.startsWith('https://') ||
          text.startsWith('doi.org') ||
          text.includes('10.'))
      ) {
        setLinkInput(text);
        setActiveMode('LINK');
        setSelectedType('LINK');
        setSelectedFile(null);
        setLinkCommitted(true);
        setSummaryResult(null);
        setSummaryMeta(null);
        setErrorMsg(null);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkInput.trim()) {
      setLinkCommitted(true);
      setSelectedType('LINK');
      setSelectedFile(null);
      setSummaryResult(null);
      setSummaryMeta(null);
      setErrorMsg(null);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setLinkInput('');
    setLinkCommitted(false);
    setSummaryResult(null);
    setSummaryMeta(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async (overrideTab?: SummaryTab, overrideLang?: AILanguage) => {
    const targetTab = overrideTab || activeTab;
    const targetLang = overrideLang || language;

    if (!selectedFile && !linkInput.trim()) {
      setErrorMsg('Please select a file (PDF, Image, Video) or enter a valid URL.');
      return;
    }

    if (!authenticated) {
      setErrorMsg('Please sign in to analyze custom documents and media in the workspace.');
      return;
    }

    if (user && !user.emailVerified) {
      setErrorMsg('Your email address must be verified to use the AI summary workspace.');
      return;
    }

    setErrorMsg(null);
    setAnalyzing(true);

    try {
      const res = await generateWorkspaceSummaryApi({
        inputType: selectedType,
        mode: targetTab as SummaryMode,
        language: targetLang,
        file: selectedFile || undefined,
        url: linkInput.trim() || undefined,
      });

      if (res.success && res.summary) {
        setSummaryResult(res.summary);
        setSummaryMeta({
          inputType: res.inputType,
          mode: res.mode as SummaryTab,
          language: res.language,
          source: res.source,
        });
        setActiveTab(targetTab);
        setLanguage(targetLang);
      } else {
        setErrorMsg('Failed to generate summary. Please try again.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const raw = err.response?.data?.message || err.message || '';
      const isLeak = /gemini|google|models\/|api_key|generativelanguage/i.test(raw);
      const msg = isLeak || !raw
        ? 'Polar Jarvis hit a small snag. Try again.'
        : raw;

      if (status === 429) {
        setErrorMsg(
          'Workspace rate limit reached (maximum 5 analyses per hour). Please wait before trying again.'
        );
      } else if (status === 401) {
        setErrorMsg('Authentication session expired. Please sign in again.');
      } else if (status === 403) {
        setErrorMsg(msg || 'Your account is not permitted to use this service.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (summaryResult) {
      navigator.clipboard.writeText(summaryResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSelectionActive = Boolean(selectedFile || (linkCommitted && linkInput.trim()));

  return (
    <section
      id="summary-section"
      className="w-full bg-white text-neutral-900 py-10 px-4 sm:px-6 lg:px-8 border-t border-neutral-100"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Section Header with Mode Switch & Back to Hero Link */}
        <div className="border-b border-neutral-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {canAccessOutreach ? (
              <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100/90 border border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => handleModeChange('SUMMARY')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    workspaceMode === 'SUMMARY'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {t('summary.modeSummary', 'Research Summary')}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('OUTREACH')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    workspaceMode === 'OUTREACH'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-sky-500" />
                  <span>{t('summary.modeOutreach', 'Outreach Studio')}</span>
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  {t('summary.title', 'AI Research Summary')}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Instant scientific extraction across custom documents, field imagery, or web articles
                </p>
              </div>
            )}
          </div>

          <button
            onClick={scrollToHero}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-neutral-500 hover:text-sky-600 transition-colors cursor-pointer group self-start sm:self-auto"
          >
            <ArrowUp className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 text-sky-500" />
            <span>Back to Hero Map</span>
          </button>
        </div>

        {/* WORKSPACE CONTENT */}
        {workspaceMode === 'OUTREACH' && canAccessOutreach ? (
          <OutreachStudioWorkspace />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Upload Workspace Box */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-2xl border-2 transition-all p-6 sm:p-8 bg-neutral-50/50 ${
                isDragging
                  ? 'border-sky-400 bg-sky-50/40'
                  : 'border-dashed border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,video/mp4,video/webm"
                onChange={handleFileChange}
                className="hidden"
              />

              {!isSelectionActive ? (
                /* Initial State */
                <div className="text-center space-y-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-800">
                      Drop a file, image, video or paste URL link
                    </p>
                    <p className="text-xs text-neutral-400">
                      Supports PDF (max 20MB), JPG/PNG/WEBP (max 10MB), MP4/WEBM (max 25MB), or public HTTPS links
                    </p>
                  </div>

                  {/* Supported Input Type Selectors */}
                  <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('FILE');
                        setSelectedType('PDF');
                        fileInputRef.current?.click();
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-neutral-700 font-medium inline-flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        activeMode === 'FILE' && selectedType === 'PDF'
                          ? 'border-sky-300 bg-sky-50/80 text-sky-800'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('FILE');
                        setSelectedType('IMAGE');
                        fileInputRef.current?.click();
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-neutral-700 font-medium inline-flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        activeMode === 'FILE' && selectedType === 'IMAGE'
                          ? 'border-purple-300 bg-purple-50/80 text-purple-800'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                      <span>Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('FILE');
                        setSelectedType('VIDEO');
                        fileInputRef.current?.click();
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-neutral-700 font-medium inline-flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        activeMode === 'FILE' && selectedType === 'VIDEO'
                          ? 'border-rose-300 bg-rose-50/80 text-rose-800'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <VideoIcon className="w-3.5 h-3.5 text-rose-600" />
                      <span>Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('LINK');
                        setSelectedType('LINK');
                        setTimeout(() => linkInputRef.current?.focus(), 50);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-neutral-700 font-medium inline-flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        activeMode === 'LINK'
                          ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Link</span>
                    </button>
                  </div>

                  {/* Action Area: Choose File OR Paste Link Input */}
                  {activeMode === 'LINK' ? (
                    <form
                      onSubmit={handleLinkSubmit}
                      className="max-w-md mx-auto flex items-center space-x-2 pt-1"
                    >
                      <div className="relative flex-1">
                        <LinkIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          ref={linkInputRef}
                          type="url"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          placeholder="https://doi.org/... or https://..."
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!linkInput.trim()}
                        className="ice-crystal-btn px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1 disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        <span>Set Link</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </form>
                  ) : (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="ice-crystal-btn px-5 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-2 cursor-pointer shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose File</span>
                      </button>
                    </div>
                  )}

                  <div className="text-[11px] font-mono text-neutral-400">
                    Tip: Click "Link" above or press ⌘V / Ctrl+V to paste a public URL
                  </div>
                </div>
              ) : (
                /* Selected File / Link State with Controls */
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1">
                      <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                        {selectedType === 'PDF' && <FileText className="w-5 h-5" />}
                        {selectedType === 'IMAGE' && <ImageIcon className="w-5 h-5" />}
                        {selectedType === 'VIDEO' && <VideoIcon className="w-5 h-5" />}
                        {selectedType === 'LINK' && <LinkIcon className="w-5 h-5" />}
                      </div>

                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                            {selectedType}
                          </span>
                          {selectedFile ? (
                            <span className="text-xs font-semibold text-neutral-900 truncate block">
                              {selectedFile.name}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={linkInput}
                              onChange={(e) => setLinkInput(e.target.value)}
                              placeholder="https://..."
                              className="text-xs font-semibold text-neutral-900 border border-neutral-200 rounded px-2 py-0.5 w-full bg-neutral-50 focus:bg-white focus:outline-none focus:border-sky-400"
                            />
                          )}
                        </div>
                        {selectedFile && (
                          <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove / Replace Controls */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedType === 'LINK') {
                            setLinkCommitted(false);
                            setActiveMode('LINK');
                          } else {
                            fileInputRef.current?.click();
                          }
                        }}
                        className="text-xs text-neutral-600 hover:text-neutral-900 px-2.5 py-1 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mode & Language Bar + Analyze Trigger */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      {/* Language Switch */}
                      <div className="flex items-center space-x-1 text-xs font-medium bg-neutral-100 px-2.5 py-1 rounded-xl border border-neutral-200">
                        <Globe className="w-3.5 h-3.5 text-neutral-500" />
                        <button
                          type="button"
                          onClick={() => setLanguage('EN')}
                          className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            language === 'EN'
                              ? 'bg-white font-bold text-neutral-900 shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          EN
                        </button>
                        <span className="text-neutral-300">|</span>
                        <button
                          type="button"
                          onClick={() => setLanguage('HI')}
                          className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            language === 'HI'
                              ? 'bg-white font-bold text-neutral-900 shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          हिंदी
                        </button>
                      </div>

                      {/* Mode Switcher */}
                      <div className="flex items-center space-x-1 text-xs font-medium bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                        <button
                          type="button"
                          onClick={() => setActiveTab('QUICK')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            activeTab === 'QUICK'
                              ? 'bg-white font-bold text-sky-700 shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          {t('summary.quick', 'Quick')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('STUDENT')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            activeTab === 'STUDENT'
                              ? 'bg-white font-bold text-sky-700 shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          {t('summary.student', 'Student')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('TECHNICAL')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            activeTab === 'TECHNICAL'
                              ? 'bg-white font-bold text-sky-700 shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          {t('summary.technical', 'Technical')}
                        </button>
                      </div>
                    </div>

                    {/* Analyze Action Button */}
                    <button
                      type="button"
                      onClick={() => handleAnalyze()}
                      disabled={analyzing}
                      className="ice-crystal-btn w-full sm:w-auto px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center space-x-2 cursor-pointer shadow-sm disabled:opacity-60"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                          <span>{language === 'HI' ? 'पोलर जार्विस काम कर रहा है...' : 'Polar Jarvis is working on it...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMsg}</span>
                  {!authenticated && (
                    <span className="block font-medium mt-1 text-red-800">
                      Sign in using the button in the top navigation bar to unlock workspace AI analyses.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Results Area (Quick | Student | Technical with Live Real Summary) */}
            {summaryResult && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-5 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                {/* Result Header Tabs & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-3.5 gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAnalyze('QUICK')}
                      disabled={analyzing}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'QUICK'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t('summary.quick', 'Quick')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAnalyze('STUDENT')}
                      disabled={analyzing}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'STUDENT'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                      <span>{t('summary.student', 'Student')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAnalyze('TECHNICAL')}
                      disabled={analyzing}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'TECHNICAL'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('summary.technical', 'Technical')}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {summaryMeta && (
                      <span className="text-[10px] font-mono uppercase font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {summaryMeta.inputType} &bull; {summaryMeta.language}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center space-x-1.5 text-xs text-neutral-600 hover:text-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                      title="Copy Summary"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">{t('summary.copied', 'Copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{t('summary.copy', 'Copy')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Loading overlay during re-analyzing */}
                {analyzing ? (
                  <div className="p-8 rounded-xl bg-neutral-50 border border-neutral-200 text-center space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
                    <p className="text-xs font-semibold text-neutral-700">
                      {language === 'HI'
                        ? 'पोलर जार्विस शोध का अध्ययन कर रहा है...'
                        : selectedType === 'PDF'
                        ? 'Polar Jarvis is reading the research...'
                        : 'Polar Jarvis is working through the report...'}
                    </p>
                  </div>
                ) : (
                  /* Formatted Summary Output */
                  <div className="p-5 rounded-xl bg-neutral-50/70 border border-neutral-200/80 text-xs sm:text-sm text-neutral-800 leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                    {summaryResult}
                  </div>
                )}

                {/* Footer disclaimer */}
                <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-2">
                  <div className="flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-500" />
                    <span>Temporary workspace session &bull; Not saved to public repository</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAnalyze()}
                    disabled={analyzing}
                    className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-700 font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t('summary.regenerate', 'Regenerate')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ResearchSummaryWorkspace;
