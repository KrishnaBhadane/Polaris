import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

export interface PublicMarqueeNewsItem {
  _id: string;
  textEn: string;
  textHi?: string;
  createdAt: string;
  expiresAt: string;
}

interface MarqueeNewsResponse {
  success: boolean;
  count: number;
  items: PublicMarqueeNewsItem[];
}

export const PolarMarqueeStrip: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [newsItems, setNewsItems] = useState<PublicMarqueeNewsItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    api
      .get<MarqueeNewsResponse>('/public/marquee-news')
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data.items)) {
          setNewsItems(res.data.items);
        }
      })
      .catch(() => {
        // Silently continue with fallback feature items on network/server error
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isHindi = i18n.language?.startsWith('hi');

  // Default fallback feature messages (using i18n)
  const defaultFeatures = [
    t('marquee.search', isHindi ? 'एकीकृत ध्रुवीय खोज' : 'Unified Polar Search'),
    t('marquee.summary', isHindi ? 'AI शोध सारांश' : 'AI Research Summaries'),
    t('marquee.uploads', isHindi ? 'सत्यापित वैज्ञानिक अपलोड' : 'Verified Scientist Uploads'),
    t('marquee.outreach', isHindi ? 'आउटरीच स्टूडियो' : 'Outreach Studio'),
  ];

  // Resolve active announcements: If 1 or more active news items exist, display ONLY active news.
  // If zero active news exist, automatically fallback to default feature messages.
  const hasActiveNews = newsItems.length > 0;

  const displayItems: string[] = hasActiveNews
    ? newsItems.map((item) => {
        if (isHindi) {
          return item.textHi && item.textHi.trim().length > 0
            ? item.textHi.trim()
            : item.textEn.trim();
        }
        return item.textEn.trim();
      })
    : defaultFeatures;

  // Determine repeat count: if we have few items (e.g. 1-2), repeat more to fill track seamlessly
  const repeatCount = hasActiveNews && displayItems.length <= 2 ? 6 : 4;

  // Render sequence repeated per set, with 2 duplicate tracks for seamless infinite -50% translateX loop
  const renderSequence = (keyPrefix: string) => (
    <div className="flex items-center shrink-0 space-x-6 sm:space-x-8 pr-6 sm:pr-8">
      {Array.from({ length: repeatCount }).map((_, loopIdx) => (
        <React.Fragment key={`${keyPrefix}-${loopIdx}`}>
          {displayItems.map((item, itemIdx) => (
            <div
              key={`${keyPrefix}-${loopIdx}-${itemIdx}`}
              className="flex items-center space-x-6 sm:space-x-8 shrink-0"
            >
              <span
                className={`text-xs sm:text-sm tracking-wide whitespace-nowrap select-none ${
                  hasActiveNews
                    ? 'font-semibold text-sky-800 bg-sky-100/90 px-3 py-0.5 rounded-full border border-sky-300/70 shadow-xs'
                    : 'font-medium text-neutral-900'
                }`}
              >
                {hasActiveNews && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-2 -translate-y-0.5 animate-pulse" />
                )}
                {item}
              </span>
              <span
                className="text-sky-500/80 text-xs sm:text-sm select-none"
                aria-hidden="true"
              >
                ✦
              </span>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div
      className="w-full max-w-full overflow-hidden bg-sky-50/80 backdrop-blur-sm border-y border-sky-200/50 h-14 min-h-[54px] flex items-center select-none relative z-10"
      aria-label="Polar features continuous marquee"
    >
      <div className="polar-marquee-track flex items-center cursor-default">
        {renderSequence('track-a')}
        {renderSequence('track-b')}
      </div>
    </div>
  );
};

export default PolarMarqueeStrip;
