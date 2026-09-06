import React, { useState, useEffect } from 'react';
import { Copy, Check, Loader2, Zap, BookOpen, Cpu, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateAISummary, type SummaryMode, type AILanguage } from '../../services/ai.service';

interface AISummaryWidgetProps {
  contentId: string;
  contentTitle?: string;
}

export const AISummaryWidget: React.FC<AISummaryWidgetProps> = ({ contentId }) => {
  const { t, i18n } = useTranslation();
  const initialLang: AILanguage = i18n.language?.startsWith('hi') ? 'HI' : 'EN';

  const [selectedMode, setSelectedMode] = useState<SummaryMode>('QUICK');
  const [selectedLang, setSelectedLang] = useState<AILanguage>(initialLang);

  // Keyed by `${mode}_${language}`
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState<number>(0);

  useEffect(() => {
    if (!loading) {
      setLoadingMsgIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(timer);
  }, [loading]);

  const getCacheKey = (mode: SummaryMode, lang: AILanguage) => `${mode}_${lang}`;

  const modeDescriptions: Record<SummaryMode, { label: string; icon: React.ReactNode }> = {
    QUICK: {
      label: t('summary.quick', 'Quick'),
      icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
    },
    STUDENT: {
      label: t('summary.student', 'Student'),
      icon: <BookOpen className="w-3.5 h-3.5 text-sky-500" />,
    },
    TECHNICAL: {
      label: t('summary.technical', 'Technical'),
      icon: <Cpu className="w-3.5 h-3.5 text-emerald-500" />,
    },
  };

  const handleFetchSummary = async (
    mode: SummaryMode,
    lang: AILanguage,
    regenerate: boolean = false
  ) => {
    setError(null);
    setLoading(true);
    setIsRegenerating(regenerate);
    try {
      const res = await generateAISummary(contentId, mode, lang, regenerate);
      if (res.success && res.summary) {
        const key = getCacheKey(mode, lang);
        setSummaries((prev) => ({ ...prev, [key]: res.summary }));
        if (res.source) {
          setSources((prev) => ({ ...prev, [key]: res.source || '' }));
        }
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
      setLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleTabClick = (mode: SummaryMode) => {
    setSelectedMode(mode);
    const key = getCacheKey(mode, selectedLang);
    if (!summaries[key]) {
      handleFetchSummary(mode, selectedLang);
    }
  };

  const handleLangChange = (lang: AILanguage) => {
    setSelectedLang(lang);
    const key = getCacheKey(selectedMode, lang);
    if (!summaries[key]) {
      handleFetchSummary(selectedMode, lang);
    }
  };

  const handleCopy = () => {
    const key = getCacheKey(selectedMode, selectedLang);
    const text = summaries[key];
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentKey = getCacheKey(selectedMode, selectedLang);
  const currentSummary = summaries[currentKey];
  const currentSource = sources[currentKey];

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 text-neutral-900 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center space-x-1.5">
            <span>{t('summary.title', 'AI Research Summary')}</span>
          </h3>
        </div>

        {/* Action & Language Controls */}
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          {/* Language Selector */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
            <button
              onClick={() => handleLangChange('EN')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedLang === 'EN'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLangChange('HI')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedLang === 'HI'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              हिंदी
            </button>
          </div>

          {currentSummary && (
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs text-neutral-700 font-medium inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">{t('summary.copied', 'Copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{t('summary.copy', 'Copy')}</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => handleFetchSummary(selectedMode, selectedLang, Boolean(currentSummary))}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {isRegenerating
                    ? 'Polar Jarvis is creating another version...'
                    : t('summary.synthesizing', 'Polar Jarvis is working on it...')}
                </span>
              </>
            ) : currentSummary ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('summary.regenerate', 'Regenerate')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('summary.generateSummary', 'Generate Summary')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100/80 rounded-2xl border border-neutral-200/60">
        {(Object.keys(modeDescriptions) as SummaryMode[]).map((mode) => {
          const item = modeDescriptions[mode];
          const isSelected = selectedMode === mode;
          const key = getCacheKey(mode, selectedLang);
          const hasSummary = Boolean(summaries[key]);

          return (
            <button
              key={mode}
              onClick={() => handleTabClick(mode)}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-neutral-900 shadow-sm border border-black/[0.04]'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {hasSummary && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Content Body */}
      {loading ? (
        <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3 animate-pulse">
          <div className="flex items-center space-x-2 text-xs font-mono text-neutral-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
            <span>
              {isRegenerating
                ? selectedLang === 'HI'
                  ? [
                      'पोलर जार्विस एक नया संस्करण तैयार कर रहा है...',
                      'पोलर जार्विस एक अलग दृष्टिकोण आजमा रहा है...',
                      'पोलर जार्विस नया सारांश रूप दे रहा है...',
                      'पोलर जार्विस काम कर रहा है...',
                    ][loadingMsgIdx]
                  : [
                      'Polar Jarvis is creating another version...',
                      'Polar Jarvis is trying a different angle...',
                      'Polar Jarvis is shaping another version...',
                      'Polar Jarvis is working hard to get this right...',
                    ][loadingMsgIdx]
                : selectedLang === 'HI'
                ? [
                    'पोलर जार्विस शोध का अध्ययन कर रहा है...',
                    'पोलर जार्विस ध्रुवीय बिंदुओं को जोड़ रहा है...',
                    'पोलर जार्विस डेटा का विश्लेषण कर रहा है...',
                    'पोलर जार्विस आपका सारांश तैयार कर रहा है...',
                  ][loadingMsgIdx]
                : [
                    'Polar Jarvis is reading through the research...',
                    'Polar Jarvis is connecting the polar dots...',
                    'Polar Jarvis is digging through the data...',
                    'Polar Jarvis is preparing your summary...',
                  ][loadingMsgIdx]}
            </span>
          </div>
          <div className="h-3 bg-neutral-200 rounded-full w-full" />
          <div className="h-3 bg-neutral-200 rounded-full w-5/6" />
          <div className="h-3 bg-neutral-200 rounded-full w-4/6" />
        </div>
      ) : currentSummary ? (
        <div className="space-y-3">
          <div className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200 text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-line font-normal">
            {currentSummary}
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>
              {selectedLang === 'HI' ? 'AI द्वारा तैयार शोध सारांश (हिंदी)' : 'AI-generated research summary (English)'}
            </span>
            {currentSource && <span>{t('summary.source', 'Source')}: {currentSource.replace(/_/g, ' ')}</span>}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-neutral-50/50 border border-dashed border-neutral-200 text-center">
          <button
            onClick={() => handleFetchSummary(selectedMode, selectedLang)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>
              {t('summary.generateSummary', 'Generate Summary')} ({selectedLang === 'HI' ? 'हिंदी' : 'English'})
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AISummaryWidget;
