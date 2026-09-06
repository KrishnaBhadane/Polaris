import React, { useState, useEffect, useCallback } from 'react';
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
  Loader2,
  AlertCircle,
  X as XIcon,
  Globe,
  Share2,
  GraduationCap,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { searchContent, getContentById } from '../../services/content.service';
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

interface FormatOption {
  format: OutreachFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface OutreachStudioWorkspaceProps {
  initialContentId?: string | null;
}

export const OutreachStudioWorkspace: React.FC<OutreachStudioWorkspaceProps> = ({
  initialContentId,
}) => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialLang: AILanguage = i18n.language?.startsWith('hi') ? 'HI' : 'EN';

  // Content Selection State
  const [contentList, setContentList] = useState<IContentItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ContentType>('ALL');
  const [selectedContent, setSelectedContent] = useState<IContentItem | null>(null);

  // Generation & Format State
  const [selectedFormat, setSelectedFormat] = useState<OutreachFormat>('WEBSITE');
  const [selectedLang, setSelectedLang] = useState<AILanguage>(initialLang);

  // Multi-draft cache keyed by `${contentId}_${format}_${lang}`
  const [draftsCache, setDraftsCache] = useState<Record<string, { draft: string; source: string | null }>>({});
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState<number>(0);

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

  const formatOptions: FormatOption[] = [
    {
      format: 'WEBSITE',
      label: t('outreach.website', 'Website Article'),
      description: 'Structured article-style summary & overview',
      icon: <Globe className="w-3.5 h-3.5 text-neutral-700" />,
    },
    {
      format: 'LINKEDIN',
      label: t('outreach.linkedin', 'LinkedIn Draft'),
      description: 'Professional executive insight & research highlights',
      icon: <Share2 className="w-3.5 h-3.5 text-neutral-700" />,
    },
    {
      format: 'X',
      label: t('outreach.x', 'X (Twitter) Draft'),
      description: 'Concise punchy update (<= 280 char limit)',
      icon: <MessageSquare className="w-3.5 h-3.5 text-neutral-700" />,
    },
    {
      format: 'INSTAGRAM',
      label: t('outreach.instagram', 'Instagram Caption'),
      description: 'Engaging visual caption with thematic hashtags',
      icon: <Share2 className="w-3.5 h-3.5 text-neutral-700" />,
    },
    {
      format: 'STUDENT',
      label: t('outreach.student', 'Student Explanation'),
      description: 'Accessible educational explanation for learners',
      icon: <GraduationCap className="w-3.5 h-3.5 text-neutral-700" />,
    },
  ];

  // Fetch initial content list
  const fetchPublishedContent = useCallback(async () => {
    try {
      setLoadingList(true);
      setError(null);
      const res = await searchContent(searchQuery, typeFilter, 1, 30);
      setContentList(res.items || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load published research.'
      );
    } finally {
      setLoadingList(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  // Handle preselected content from URL or props
  useEffect(() => {
    const targetId = initialContentId || searchParams.get('contentId');
    if (targetId && (!selectedContent || selectedContent._id !== targetId)) {
      getContentById(targetId)
        .then((item) => {
          if (item) {
            setSelectedContent(item);
          }
        })
        .catch(() => {
          // ignore error if not found
        });
    }
  }, [initialContentId, searchParams, selectedContent]);

  const getCacheKey = (cId: string, fmt: OutreachFormat, lang: AILanguage) =>
    `${cId}_${fmt}_${lang}`;

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
          [key]: { draft: res.draft, source: res.source || null },
        }));
      } else {
        setError('Polar Jarvis hit a small snag. Try again.');
      }
    } catch (err: any) {
      const raw = err.response?.data?.message || err.message || '';
      const isLeak = /gemini|google|models\/|api_key|generativelanguage/i.test(raw);
      const message = isLeak || !raw
        ? 'Polar Jarvis hit a small snag. Try again.'
        : raw;
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectItem = (item: IContentItem) => {
    setSelectedContent(item);
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

  const currentKey = selectedContent
    ? getCacheKey(selectedContent._id, selectedFormat, selectedLang)
    : '';
  const currentDraftData = currentKey ? draftsCache[currentKey] : null;
  const currentDraft = currentDraftData?.draft || '';
  const currentSource = currentDraftData?.source || null;

  const handleCopy = () => {
    if (currentDraft) {
      navigator.clipboard.writeText(currentDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const setEditDraft = (val: string) => {
    if (!currentKey) return;
    setDraftsCache((prev) => ({
      ...prev,
      [currentKey]: { draft: val, source: currentSource },
    }));
  };

  // Character counter for X format
  const xCharCount = currentDraft.length;
  const isXOverLimit = selectedFormat === 'X' && xCharCount > 280;

  return (
    <div className="space-y-6">
      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: SELECT PUBLISHED RESEARCH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono">
            1. Select Published Research
          </span>
          {selectedContent && (
            <button
              onClick={handleChangeItem}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
            >
              Change Selection
            </button>
          )}
        </div>

        {selectedContent ? (
          /* Compact Selected State */
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3 overflow-hidden flex-1">
              <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs">
                {typeIcons[selectedContent.type] || <FileText className="w-4 h-4 text-neutral-600" />}
              </div>
              <div className="overflow-hidden flex-1 space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-800">
                    {selectedContent.type}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 truncate block">
                    {selectedContent.title}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-neutral-500">
                  <span>{selectedContent.scientistName || selectedContent.institution || 'Polaris Researcher'}</span>
                  {selectedContent.year && (
                    <>
                      <span>&bull;</span>
                      <span>{selectedContent.year}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleChangeItem}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-xs"
            >
              Replace
            </button>
          </div>
        ) : (
          /* Search & Filterable Selectable List */
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Search + Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search published papers, datasets, reports..."
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

            {/* List */}
            {loadingList ? (
              <div className="space-y-2 py-4 animate-pulse">
                <div className="h-10 bg-neutral-100 rounded-xl" />
                <div className="h-10 bg-neutral-100 rounded-xl" />
                <div className="h-10 bg-neutral-100 rounded-xl" />
              </div>
            ) : contentList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-neutral-50/60 border border-neutral-100 text-xs text-neutral-500 space-y-1">
                <p className="font-semibold text-neutral-700">No published research found.</p>
                <p className="text-neutral-400">Try adjusting your search query or filter.</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-100">
                {contentList.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleSelectItem(item)}
                    className="p-3 rounded-xl hover:bg-neutral-50 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden flex-1">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                        {typeIcons[item.type] || <FileText className="w-3.5 h-3.5 text-neutral-500" />}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono uppercase text-neutral-500 font-semibold">
                            {item.type}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900 truncate block group-hover:text-sky-600 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {item.scientistName || item.institution || 'Polaris Researcher'}{' '}
                          {item.year ? `• ${item.year}` : ''}
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

      {/* STEP 2: OUTPUT FORMAT & LANGUAGE SELECTOR */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono">
            2. Choose Output Format & Language
          </span>

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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {formatOptions.map((opt) => {
            const isSelected = selectedFormat === opt.format;
            return (
              <button
                key={opt.format}
                type="button"
                onClick={() => handleSelectFormat(opt.format)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'border-sky-400 bg-sky-50/50 shadow-xs ring-1 ring-sky-400/50'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">{opt.label}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-sky-600 text-white' : 'border border-neutral-300'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500 leading-tight line-clamp-2">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* GENERATE ACTION BUTTON */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-neutral-500 font-mono">
          {selectedContent
            ? `Target: ${selectedContent.title.slice(0, 30)}... (${selectedFormat} - ${selectedLang})`
            : 'Select a research item to activate synthesis'}
        </div>

        <button
          type="button"
          onClick={() => handleGenerateDraft()}
          disabled={!selectedContent || generating}
          className="ice-crystal-btn px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center space-x-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
              <span>{t('outreach.regenerating', 'Generating draft...')}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>{currentDraft ? 'Regenerate Draft' : t('outreach.generateDraft', 'Generate Draft')}</span>
            </>
          )}
        </button>
      </div>

      {/* STEP 3: DRAFT RESULT AREA & EDITOR */}
      {(currentDraft || generating) && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          {/* Draft Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-neutral-900">Generated Draft</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {selectedFormat} &bull; {selectedLang}
                </span>
                {currentSource && (
                  <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    Source: {currentSource}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {t(
                  'outreach.humanReviewNotice',
                  'Human review & edit recommended before publishing. POLARIS does not auto-post.'
                )}
              </p>
            </div>

            {/* X Character Counter or Mode Details */}
            {selectedFormat === 'X' && (
              <div
                className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                  isXOverLimit
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                }`}
              >
                <span>{xCharCount} / 280 characters</span>
                {isXOverLimit && <span className="ml-1 text-[10px] block text-rose-600">Exceeds 280</span>}
              </div>
            )}
          </div>

          {/* Editable Text Area */}
          {generating ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
              <p className="text-xs text-neutral-500 font-medium">
                {selectedLang === 'HI'
                  ? [
                      'पोलर जार्विस आपका आउटरीच ड्राफ्ट तैयार कर रहा है...',
                      'पोलर जार्विस इस ड्राफ्ट को एक नया कोण दे रहा है...',
                      'पोलर जार्विस शोध का प्रसार ड्राफ्ट तैयार कर रहा है...',
                      'पोलर जार्विस काम कर रहा है...',
                    ][loadingMsgIdx]
                  : [
                      'Polar Jarvis is preparing your outreach draft...',
                      'Polar Jarvis is giving this draft a fresh angle...',
                      'Polar Jarvis is connecting the polar dots...',
                      'Polar Jarvis is working hard to get this right...',
                    ][loadingMsgIdx]}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={currentDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={selectedFormat === 'X' ? 4 : 8}
                  placeholder="Generated draft will appear here..."
                  className="w-full p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 text-xs sm:text-sm text-neutral-900 leading-relaxed placeholder:text-neutral-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-normal"
                />
              </div>

              {/* Action Buttons: Copy & Regenerate */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-neutral-400 font-mono">
                  Tip: Edit directly above before copying
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDraft(undefined, undefined, true)}
                    disabled={generating}
                    className="px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('outreach.copied', 'Copied to clipboard')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('outreach.copy', 'Copy Draft')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OutreachStudioWorkspace;
