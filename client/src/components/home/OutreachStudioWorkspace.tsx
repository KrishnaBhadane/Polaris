import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Compass,
  Search,
  Check,
  Copy,
  RefreshCw,
  RotateCcw,
  Loader2,
  AlertCircle,
  X as XIcon,
  Share2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Lock,
  Tag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getMySubmissions } from '../../services/content.service';
import { generateAIOutreach, type OutreachFormat, type AILanguage } from '../../services/ai.service';
import type { IContentItem, ContentType } from '../../types/content.types';

const typeIcons: Record<ContentType, React.ReactNode> = {
  REPORT: <FileText className="w-3.5 h-3.5 text-sky-600" />,
  PUBLICATION: <BookOpen className="w-3.5 h-3.5 text-indigo-600" />,
  DATASET: <Database className="w-3.5 h-3.5 text-emerald-600" />,
  IMAGE: <ImageIcon className="w-3.5 h-3.5 text-purple-600" />,
  VIDEO: <VideoIcon className="w-3.5 h-3.5 text-rose-600" />,
  ACTIVITY: <Compass className="w-3.5 h-3.5 text-amber-600" />,
};

interface PlatformOption {
  format: OutreachFormat;
  label: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  charLimitNotice: string;
}

interface DraftEntry {
  draft: string;
  originalDraft: string;
  source: string | null;
}

interface OutreachStudioWorkspaceProps {
  initialContentId?: string | null;
}

export const OutreachStudioWorkspace: React.FC<OutreachStudioWorkspaceProps> = ({
  initialContentId,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialLang: AILanguage = i18n.language?.startsWith('hi') ? 'HI' : 'EN';

  // ── 1. Content Eligibility State (Current User's PUBLISHED Research Only) ──
  const [contentList, setContentList] = useState<IContentItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ContentType>('ALL');
  const [selectedContent, setSelectedContent] = useState<IContentItem | null>(null);

  // ── 2. Platform & Language State ──
  const [selectedFormat, setSelectedFormat] = useState<OutreachFormat>('LINKEDIN');
  const [selectedLang, setSelectedLang] = useState<AILanguage>(initialLang);

  // ── 3. Draft & Editor State ──
  const [draftsCache, setDraftsCache] = useState<Record<string, DraftEntry>>({});
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHashtag, setCopiedHashtag] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  const platformOptions: PlatformOption[] = [
    {
      format: 'LINKEDIN',
      label: 'LinkedIn Post',
      badge: 'Professional',
      description: 'Structured, factual executive summary with scientific significance & research highlights.',
      icon: <Share2 className="w-4 h-4 text-sky-600" />,
      charLimitNotice: 'Recommended under 3,000 characters for maximum feed visibility',
    },
    {
      format: 'INSTAGRAM',
      label: 'Instagram Caption',
      badge: 'Visual & Engaging',
      description: 'Engaging hook, accessible polar narrative, clean hashtags & research image pairing.',
      icon: <ImageIcon className="w-4 h-4 text-pink-600" />,
      charLimitNotice: 'Maximum 2,200 characters for Instagram captions',
    },
  ];

  // Animated loading messages
  useEffect(() => {
    if (!generating) {
      setLoadingMsgIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(timer);
  }, [generating]);

  // ── Fetch current user's published content only ──
  const fetchMyPublishedContent = useCallback(async () => {
    try {
      setLoadingList(true);
      setError(null);
      // Calls /api/content/mine (enforces user == authenticated user)
      const mySubmissions = await getMySubmissions();
      // Filter exclusively for PUBLISHED items
      const publishedOnly = (mySubmissions || []).filter(
        (item) => item.status === 'PUBLISHED'
      );
      setContentList(publishedOnly);

      // Verify preselected content from URL or props
      const targetId = initialContentId || searchParams.get('contentId');
      if (targetId) {
        const found = publishedOnly.find((item) => item._id === targetId);
        if (found) {
          setSelectedContent(found);
        } else {
          // If URL contentId does not belong to user's published items, reject selection
          setSelectedContent(null);
          setSearchParams((prev) => {
            prev.delete('contentId');
            return prev;
          });
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load your published research.'
      );
    } finally {
      setLoadingList(false);
    }
  }, [initialContentId, searchParams, setSearchParams]);

  useEffect(() => {
    fetchMyPublishedContent();
  }, [fetchMyPublishedContent]);

  // Filter content items by search query and content type
  const filteredContent = useMemo(() => {
    return contentList.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.institution?.toLowerCase().includes(q) ||
        item.researchTopic?.toLowerCase().includes(q) ||
        item.region?.toLowerCase().includes(q) ||
        item.expedition?.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [contentList, searchQuery, typeFilter]);

  const getCacheKey = (cId: string, fmt: OutreachFormat, lang: AILanguage) =>
    `${cId}_${fmt}_${lang}`;

  // Current draft data
  const currentKey = selectedContent
    ? getCacheKey(selectedContent._id, selectedFormat, selectedLang)
    : '';
  const currentDraftData = currentKey ? draftsCache[currentKey] : null;
  const currentDraft = currentDraftData?.draft || '';
  const originalDraft = currentDraftData?.originalDraft || '';
  const currentSource = currentDraftData?.source || null;

  const isDraftModified = Boolean(
    currentDraft && originalDraft && currentDraft.trim() !== originalDraft.trim()
  );

  // Extract hashtags from the draft text cleanly
  const extractedHashtags = useMemo(() => {
    if (!currentDraft) return [];
    // Match hashtags in English and Devanagari Unicode
    const matches = currentDraft.match(/#([A-Za-z0-9_\u0900-\u097F]+)/g) || [];
    // Deduplicate
    return Array.from(new Set(matches));
  }, [currentDraft]);

  // Handle format change
  const handleSelectFormat = (fmt: OutreachFormat) => {
    setSelectedFormat(fmt);
  };

  // Handle language toggle
  const handleSelectLang = (lang: AILanguage) => {
    setSelectedLang(lang);
  };

  // Generate Draft Action
  const handleGenerateDraft = async (
    formatToUse?: OutreachFormat,
    langToUse?: AILanguage,
    regenerate: boolean = false
  ) => {
    if (!selectedContent) {
      setError(t('outreach.selectResearch', 'Please select a published research record first.'));
      return;
    }

    const fmt = formatToUse || selectedFormat;
    const lang = langToUse || selectedLang;
    const key = getCacheKey(selectedContent._id, fmt, lang);

    try {
      setGenerating(true);
      setError(null);
      setCopied(false);
      const res = await generateAIOutreach(selectedContent._id, fmt, lang, regenerate);
      if (res.success && res.draft) {
        setDraftsCache((prev) => ({
          ...prev,
          [key]: {
            draft: res.draft,
            originalDraft: res.draft,
            source: res.source || null,
          },
        }));
      } else {
        setError('Unable to synthesize outreach draft. Please try again.');
      }
    } catch (err: any) {
      const raw = err.response?.data?.message || err.message || '';
      const isLeak = /gemini|google|models\/|api_key|generativelanguage/i.test(raw);
      const message = isLeak || !raw
        ? 'Unable to generate outreach draft. Please try again.'
        : raw;
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectItem = (item: IContentItem) => {
    setSelectedContent(item);
    setError(null);
    setSearchParams((prev) => {
      prev.set('tab', 'outreach');
      prev.set('contentId', item._id);
      return prev;
    });
  };

  const handleChangeItem = () => {
    setSelectedContent(null);
    setSearchParams((prev) => {
      prev.set('tab', 'outreach');
      prev.delete('contentId');
      return prev;
    });
  };

  const handleCopyDraft = () => {
    if (currentDraft) {
      navigator.clipboard.writeText(currentDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopySingleHashtag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedHashtag(tag);
    setTimeout(() => setCopiedHashtag(null), 1500);
  };

  const setEditDraft = (val: string) => {
    if (!currentKey) return;
    setDraftsCache((prev) => ({
      ...prev,
      [currentKey]: {
        draft: val,
        originalDraft: prev[currentKey]?.originalDraft || val,
        source: currentSource,
      },
    }));
  };

  const handleResetDraft = () => {
    if (!currentKey || !originalDraft) return;
    setDraftsCache((prev) => ({
      ...prev,
      [currentKey]: {
        ...prev[currentKey],
        draft: originalDraft,
      },
    }));
  };

  // Character counter
  const charCount = currentDraft.length;
  const isLinkedInOverLimit = selectedFormat === 'LINKEDIN' && charCount > 3000;
  const isInstagramOverLimit = selectedFormat === 'INSTAGRAM' && charCount > 2200;
  const isOverLimit = isLinkedInOverLimit || isInstagramOverLimit;

  const userDisplayName = user?.name || 'Polaris Researcher';
  const userHandle = user?.name
    ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    : 'polaris_research';

  return (
    <div className="space-y-6">
      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5"
            aria-label="Dismiss error"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: MY PUBLISHED RESEARCH (Content Picker) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 font-mono">
              My Published Research
            </h3>
            <span className="text-[11px] text-neutral-400">
              ({contentList.length} eligible)
            </span>
          </div>
          {selectedContent && (
            <button
              onClick={handleChangeItem}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer transition-colors"
            >
              Change Selection
            </button>
          )}
        </div>

        {selectedContent ? (
          /* Compact Selected State */
          <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3 overflow-hidden flex-1">
              {/* Thumbnail or Type Icon */}
              {selectedContent.thumbnailUrl ? (
                <img
                  src={selectedContent.thumbnailUrl}
                  alt={selectedContent.title}
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0 bg-neutral-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs">
                  {typeIcons[selectedContent.type] || <FileText className="w-5 h-5 text-neutral-600" />}
                </div>
              )}

              <div className="overflow-hidden flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-800 shrink-0">
                    {selectedContent.type}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 truncate block">
                    {selectedContent.title}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
                  <span>{selectedContent.institution || 'Polaris Researcher'}</span>
                  {selectedContent.year && <span>• {selectedContent.year}</span>}
                  {selectedContent.researchTopic && (
                    <span className="text-neutral-400">• {selectedContent.researchTopic}</span>
                  )}
                  {selectedContent.region && (
                    <span className="text-neutral-400">• {selectedContent.region}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleChangeItem}
              className="px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-xs"
            >
              Replace
            </button>
          </div>
        ) : (
          /* Filterable Content Selector */
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Search + Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, topic, keywords, or expedition..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {(['ALL', 'REPORT', 'PUBLICATION', 'DATASET', 'IMAGE', 'VIDEO', 'ACTIVITY'] as const).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        typeFilter === t
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                      }`}
                    >
                      {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Content List / Empty State */}
            {loadingList ? (
              <div className="space-y-2 py-4 animate-pulse">
                <div className="h-12 bg-neutral-100 rounded-xl" />
                <div className="h-12 bg-neutral-100 rounded-xl" />
                <div className="h-12 bg-neutral-100 rounded-xl" />
              </div>
            ) : contentList.length === 0 ? (
              /* Clean Empty State */
              <div className="p-8 text-center rounded-2xl bg-neutral-50/70 border border-dashed border-neutral-200 text-xs text-neutral-500 space-y-2">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                  <ShieldCheck className="w-5 h-5 text-neutral-500" />
                </div>
                <p className="font-semibold text-neutral-800 text-sm">
                  No published research is available for Outreach yet.
                </p>
                <p className="text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Only research that you submitted and has been approved and published appears here.
                  Once approved by POLARIS moderators, your papers, datasets, and reports will be ready for social outreach generation.
                </p>
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-500 space-y-1">
                <p className="font-semibold text-neutral-700">No matching research found.</p>
                <p className="text-neutral-400">Try adjusting your search query or type filter.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-neutral-100">
                {filteredContent.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleSelectItem(item)}
                    className="pt-2 first:pt-0 p-3 rounded-xl hover:bg-neutral-50 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden flex-1">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-9 h-9 rounded-lg object-cover border border-neutral-200 shrink-0 bg-neutral-100"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-white border border-neutral-200/60 transition-colors">
                          {typeIcons[item.type] || <FileText className="w-4 h-4 text-neutral-500" />}
                        </div>
                      )}

                      <div className="overflow-hidden flex-1 space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-mono uppercase text-neutral-600 font-bold px-1.5 py-0.5 rounded bg-neutral-100">
                            {item.type}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900 truncate block group-hover:text-sky-600 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate flex items-center space-x-1.5">
                          <span>{item.institution || 'Polaris Researcher'}</span>
                          {item.year && <span>• {item.year}</span>}
                          {item.researchTopic && (
                            <span className="text-neutral-400 truncate">• {item.researchTopic}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-semibold text-neutral-400 group-hover:text-sky-600 flex items-center space-x-1">
                      <span>Select</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: SELECT PLATFORM & LANGUAGE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 font-mono">
              Select Platform & Language
            </h3>
          </div>

          {/* Language Selector */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleSelectLang('EN')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedLang === 'EN'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleSelectLang('HI')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedLang === 'HI'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              हिंदी (Hindi)
            </button>
          </div>
        </div>

        {/* 2 Platform Cards: LinkedIn & Instagram */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {platformOptions.map((opt) => {
            const isSelected = selectedFormat === opt.format;
            return (
              <button
                key={opt.format}
                type="button"
                onClick={() => handleSelectFormat(opt.format)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 relative ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/40 shadow-xs ring-1 ring-sky-400/40'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shadow-xs">
                      {opt.icon}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">
                        {opt.label}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {opt.badge}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-sky-600 text-white' : 'border border-neutral-300'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  {opt.description}
                </p>
                <div className="text-[10px] text-neutral-400 font-mono pt-0.5">
                  {opt.charLimitNotice}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* GENERATE ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-neutral-100">
        <div className="text-[11px] text-neutral-500 font-mono">
          {selectedContent ? (
            <span className="text-neutral-700">
              Target: <span className="font-semibold text-neutral-900">{selectedContent.title.slice(0, 38)}...</span> ({selectedFormat} &bull; {selectedLang})
            </span>
          ) : (
            <span className="text-neutral-400">Select a research item above to activate synthesis</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleGenerateDraft(undefined, undefined, Boolean(currentDraft))}
          disabled={!selectedContent || generating}
          className="ice-crystal-btn px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center space-x-2 cursor-pointer shadow-sm disabled:opacity-50 transition-all self-stretch sm:self-auto"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              <span>Generating outreach draft...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>{currentDraft ? 'Regenerate Draft' : 'Generate Outreach Draft'}</span>
            </>
          )}
        </button>
      </div>

      {/* STEP 3: EDITABLE DRAFT & PLATFORM PREVIEW */}
      {(currentDraft || generating) && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 font-mono">
                Edit & Platform Review
              </h3>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="inline-flex lg:hidden items-center p-0.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
              <button
                type="button"
                onClick={() => setMobileTab('editor')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  mobileTab === 'editor'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  mobileTab === 'preview'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          {/* DUAL WORKSPACE: Editor & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── COLUMN A: DRAFT EDITOR ── */}
            <div
              className={`rounded-3xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm ${
                mobileTab === 'editor' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-neutral-900">Editable Draft</h4>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      {selectedFormat} &bull; {selectedLang}
                    </span>
                    {isDraftModified && (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                        Edited
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Review and tailor your text before manual publication.
                  </p>
                </div>

                {/* Character Counter */}
                <div
                  className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                    isOverLimit
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                  }`}
                >
                  <span>{charCount} chars</span>
                  {selectedFormat === 'INSTAGRAM' && (
                    <span className="text-[10px] text-neutral-400 ml-1">/ 2,200</span>
                  )}
                  {selectedFormat === 'LINKEDIN' && (
                    <span className="text-[10px] text-neutral-400 ml-1">/ 3,000</span>
                  )}
                </div>
              </div>

              {generating ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
                  <p className="text-xs text-neutral-500 font-medium">
                    {selectedLang === 'HI'
                      ? [
                          'पोलारिस एआई आपका आउटरीच ड्राफ्ट तैयार कर रहा है...',
                          'शोध की मुख्य बातें और संदर्भ तैयार किए जा रहे हैं...',
                          'ड्राफ्ट की वैज्ञानिक सटीकता जांची जा रही है...',
                          'आउटरीच ड्राफ्ट अंतिम रूप ले रहा है...',
                        ][loadingMsgIdx]
                      : [
                          'Synthesizing outreach draft from verified research...',
                          'Translating polar findings into accessible outreach language...',
                          'Structuring factual context and research significance...',
                          'Polishing draft for human review and dissemination...',
                        ][loadingMsgIdx]}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={currentDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={selectedFormat === 'INSTAGRAM' ? 9 : 12}
                    placeholder="Generated outreach draft will appear here..."
                    className="w-full p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 leading-relaxed placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-normal resize-y"
                  />

                  {/* Scientific Hashtags Section */}
                  {extractedHashtags.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span className="font-semibold flex items-center space-x-1">
                          <Tag className="w-3 h-3 text-sky-600" />
                          <span>Detected Hashtags</span>
                        </span>
                        <span className="text-[10px] text-neutral-400">Click to copy single</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {extractedHashtags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleCopySingleHashtag(tag)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all cursor-pointer ${
                              copiedHashtag === tag
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                : 'bg-white border-neutral-200 text-neutral-700 hover:border-sky-300 hover:text-sky-700'
                            }`}
                          >
                            {copiedHashtag === tag ? 'Copied!' : tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions: Reset, Regenerate, Copy */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                    <div className="flex items-center space-x-2">
                      {isDraftModified && (
                        <button
                          type="button"
                          onClick={handleResetDraft}
                          className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Reset changes back to AI original"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGenerateDraft(undefined, undefined, true)}
                        disabled={generating}
                        className="px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className={`px-4 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied to clipboard</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── COLUMN B: LIVE PLATFORM PREVIEW ── */}
            <div
              className={`rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5 space-y-4 shadow-sm ${
                mobileTab === 'preview' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-neutral-900 flex items-center space-x-1.5">
                    <span>Platform Preview: {selectedFormat === 'LINKEDIN' ? 'LinkedIn' : 'Instagram'}</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Visual simulation of your reviewed outreach post
                  </p>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 bg-white border border-neutral-200 px-2 py-0.5 rounded-full">
                  Read-Only Preview
                </span>
              </div>

              {selectedFormat === 'LINKEDIN' ? (
                /* LinkedIn Card Preview */
                <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3 shadow-xs">
                  {/* LinkedIn Header */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden flex-1 leading-tight">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {userDisplayName}
                        </span>
                        <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded">
                          POLARIS
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block truncate">
                        {selectedContent?.institution || 'Polar & Marine Researcher'} &bull; Verified Scientist
                      </span>
                      <span className="text-[10px] text-neutral-400">Just now &bull; 🌐</span>
                    </div>
                  </div>

                  {/* LinkedIn Text Content */}
                  <div className="text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto pr-1">
                    {currentDraft || 'Draft content will render here...'}
                  </div>

                  {/* LinkedIn Embedded Research Attachment Card */}
                  {selectedContent && (
                    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50/70 p-3 flex items-center space-x-3">
                      {selectedContent.thumbnailUrl ? (
                        <img
                          src={selectedContent.thumbnailUrl}
                          alt={selectedContent.title}
                          className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shrink-0 bg-neutral-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                          {typeIcons[selectedContent.type] || <FileText className="w-6 h-6 text-neutral-500" />}
                        </div>
                      )}
                      <div className="overflow-hidden flex-1 space-y-0.5">
                        <span className="text-[9px] font-mono font-bold uppercase text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          {selectedContent.type}
                        </span>
                        <h5 className="text-xs font-bold text-neutral-900 truncate">
                          {selectedContent.title}
                        </h5>
                        <p className="text-[10px] text-neutral-500 truncate">
                          polaris.ncpor.res.in &bull; {selectedContent.institution || 'NCPOR Portal'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Instagram Card Preview */
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs max-w-sm mx-auto">
                  {/* Instagram Header */}
                  <div className="p-3 flex items-center space-x-2.5 border-b border-neutral-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-500 p-0.5">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-neutral-800">
                        {userDisplayName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="overflow-hidden flex-1 leading-tight">
                      <span className="text-xs font-bold text-neutral-900 block truncate">
                        {userHandle}
                      </span>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        POLARIS Field Research &bull; {selectedContent?.region || 'Polar Oceans'}
                      </span>
                    </div>
                  </div>

                  {/* Instagram Media: Thumbnail or Clean Fallback */}
                  {selectedContent?.thumbnailUrl ? (
                    <div className="w-full bg-neutral-900 overflow-hidden max-h-64 flex items-center justify-center">
                      <img
                        src={selectedContent.thumbnailUrl}
                        alt={selectedContent.title}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  ) : (
                    /* Graceful No-Thumbnail Fallback Banner */
                    <div className="w-full h-44 bg-gradient-to-b from-sky-50 to-neutral-100 border-y border-neutral-200/80 p-6 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 shadow-xs">
                        <ImageIcon className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-neutral-700">
                          Ready for Field Media
                        </p>
                        <p className="text-[10px] text-neutral-400 max-w-xs">
                          No image thumbnail attached to this research item — caption ready to pair with your expedition imagery.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Instagram Caption & Details */}
                  <div className="p-3.5 space-y-1.5">
                    <div className="text-xs text-neutral-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap pr-1">
                      <span className="font-bold text-neutral-900 mr-1.5">{userHandle}</span>
                      {currentDraft || 'Your Instagram caption will preview here...'}
                    </div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wide pt-1">
                      Verified POLARIS Research
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FUTURE AUTOPOST PREPARATION (Clearly Disabled, Planned Only) */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-200/70 text-neutral-600 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-neutral-600" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h5 className="text-xs font-bold text-neutral-800">
                    Direct Social Publishing
                  </h5>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-neutral-200 text-neutral-700">
                    Planned Feature
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 max-w-xl leading-relaxed">
                  Direct automatic publishing to LinkedIn and Instagram is planned for a future release.
                  In this phase, please review, edit, and copy your draft above to publish manually.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 bg-neutral-200/80 text-neutral-500 cursor-not-allowed shrink-0 border border-neutral-300/50"
              title="Publishing feature is currently in planned development"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Publish — coming next</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutreachStudioWorkspace;
