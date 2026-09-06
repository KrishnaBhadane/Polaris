import React, { useState } from 'react';
import { PolarRealisticHero } from '../components/hero/PolarRealisticHero';
import { PolarMarqueeStrip } from '../components/home/PolarMarqueeStrip';
import { HomeExploreSection } from '../components/home/HomeExploreSection';
import { ResearchSummaryWorkspace } from '../components/home/ResearchSummaryWorkspace';

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleHeroSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="w-full min-h-screen bg-[#02050c] flex flex-col">
      {/* 1. Hero Section */}
      <PolarRealisticHero onSearch={handleHeroSearch} />

      {/* 2. Continuous Horizontal Marquee Strip */}
      <PolarMarqueeStrip />

      {/* 3. Homepage Explore Section (Directly below Marquee) */}
      <HomeExploreSection
        initialSearchQuery={searchQuery}
        onClearSearch={handleClearSearch}
      />

      {/* 4. Research Summary Workspace (Directly below Explore) */}
      <ResearchSummaryWorkspace />
    </div>
  );
};

export default HomePage;
