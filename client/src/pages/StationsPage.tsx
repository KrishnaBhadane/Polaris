import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowRight,
  Compass,
  FileText,
  BookOpen,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Radio
} from 'lucide-react';
import { searchContent } from '../services/content.service';
import { createExpeditionSlug } from '../services/expedition.service';
import type { IContentItem, ContentType } from '../types/content.types';

interface StationData {
  id: string;
  name: string;
  region: 'Antarctica' | 'Arctic';
  location: string;
  description: string;
  image: string;
  searchKey: string;
}

const STATIONS: StationData[] = [
  {
    id: 'maitri',
    name: 'Maitri',
    region: 'Antarctica',
    location: 'Queen Maud Land',
    description:
      'India’s long-standing Antarctic research station supporting multidisciplinary polar science.',
    image: '/stations/maitri.jpg',
    searchKey: 'Maitri',
  },
  {
    id: 'bharati',
    name: 'Bharati',
    region: 'Antarctica',
    location: 'Larsemann Hills',
    description:
      'A modern Antarctic research station supporting atmospheric, geological, ocean and climate studies.',
    image: '/stations/bharati.jpg',
    searchKey: 'Bharati',
  },
  {
    id: 'himadri',
    name: 'Himadri',
    region: 'Arctic',
    location: 'Ny-Ålesund, Svalbard',
    description:
      'India’s Arctic research station supporting studies in climate, atmosphere, glaciers and polar ecosystems.',
    image: '/stations/himadri.jpg',
    searchKey: 'Himadri',
  },
];

const typeIcons: Record<ContentType, React.ReactNode> = {
  REPORT: <FileText className="w-3 h-3 text-sky-600" />,
  PUBLICATION: <BookOpen className="w-3 h-3 text-indigo-600" />,
  DATASET: <Database className="w-3 h-3 text-emerald-600" />,
  IMAGE: <ImageIcon className="w-3 h-3 text-purple-600" />,
  VIDEO: <VideoIcon className="w-3 h-3 text-rose-600" />,
  ACTIVITY: <Compass className="w-3 h-3 text-amber-600" />,
};

export const StationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedStationId = searchParams.get('station')?.toLowerCase();

  // Related content per station
  const [stationRecords, setStationRecords] = useState<Record<string, IContentItem[]>>({});
  const [loadingRecords, setLoadingRecords] = useState<Record<string, boolean>>({});

  const stationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch real related content for each station
  useEffect(() => {
    STATIONS.forEach(async (station) => {
      try {
        setLoadingRecords((prev) => ({ ...prev, [station.id]: true }));
        const res = await searchContent(station.searchKey, undefined, 1, 3);
        setStationRecords((prev) => ({ ...prev, [station.id]: res.items || [] }));
      } catch {
        setStationRecords((prev) => ({ ...prev, [station.id]: [] }));
      } finally {
        setLoadingRecords((prev) => ({ ...prev, [station.id]: false }));
      }
    });
  }, []);

  // Scroll to selected station if parameter is present
  useEffect(() => {
    if (selectedStationId && stationRefs.current[selectedStationId]) {
      setTimeout(() => {
        stationRefs.current[selectedStationId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [selectedStationId]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
        {/* Page Intro (Minimal) */}
        <div className="border-b border-neutral-100 pb-5 space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-sky-600">
            <Radio className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
            <span>Permanent Observatories</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Research Stations
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal">
            India’s polar research presence
          </p>
        </div>

        {/* Stations 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {STATIONS.map((station) => {
            const isHighlighted = selectedStationId === station.id;
            const records = stationRecords[station.id] || [];
            const isLoading = loadingRecords[station.id];

            return (
              <div
                key={station.id}
                ref={(el) => {
                  stationRefs.current[station.id] = el;
                }}
                className={`rounded-3xl border bg-white flex flex-col justify-between overflow-hidden transition-all duration-300 shadow-xs ${
                  isHighlighted
                    ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-lg shadow-sky-100/50'
                    : 'border-neutral-200/90 hover:border-neutral-300'
                }`}
              >
                {/* Station Visual Banner */}
                <div className="relative aspect-16/9 w-full bg-neutral-100 overflow-hidden group">
                  <img
                    src={station.image}
                    alt={`${station.name} Research Station`}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Region Pill */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase backdrop-blur-md shadow-xs ${
                        station.region === 'Arctic'
                          ? 'bg-amber-950/80 text-amber-200 border border-amber-400/30'
                          : 'bg-black/70 text-sky-200 border border-sky-400/30'
                      }`}
                    >
                      {station.region}
                    </span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    {/* Header: Name & Location */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                          {station.name}
                        </h2>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-neutral-500">
                        <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span>{station.location}</span>
                      </div>
                    </div>

                    {/* One-Line Description */}
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                      {station.description}
                    </p>

                    {/* Related Published Research Preview */}
                    <div className="pt-3 border-t border-neutral-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 tracking-wider">
                          Recent Published Research
                        </span>
                        {records.length > 0 && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            {records.length} {records.length === 1 ? 'record' : 'records'}
                          </span>
                        )}
                      </div>

                      {isLoading ? (
                        <div className="space-y-1.5 py-2 animate-pulse">
                          <div className="h-6 bg-neutral-100 rounded-lg" />
                          <div className="h-6 bg-neutral-100 rounded-lg" />
                        </div>
                      ) : records.length === 0 ? (
                        <div className="py-3 px-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                          <span className="text-[11px] text-neutral-400">
                            No published records catalogued yet
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {records.map((item) => (
                            <div
                              key={item._id}
                              className="p-2 rounded-xl bg-neutral-50/70 hover:bg-neutral-100/80 border border-neutral-100 flex items-center justify-between gap-2 transition-colors group/item"
                            >
                              <Link
                                to={`/content/${item._id}`}
                                className="flex items-center space-x-2 overflow-hidden flex-1 min-w-0"
                              >
                                <span className="shrink-0">{typeIcons[item.type] || <FileText className="w-3 h-3 text-neutral-500" />}</span>
                                <span className="text-xs text-neutral-800 group-hover/item:text-sky-600 font-medium truncate">
                                  {item.title}
                                </span>
                              </Link>
                              <div className="flex items-center space-x-2 shrink-0">
                                {item.expedition && (
                                  <Link
                                    to={`/expeditions/${createExpeditionSlug(item.expedition)}`}
                                    className="text-[10px] font-mono text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200/60 transition-colors"
                                    title={`Expedition Hub: ${item.expedition}`}
                                  >
                                    {item.expedition}
                                  </Link>
                                )}
                                {item.year && (
                                  <span className="text-[10px] font-mono text-neutral-400">
                                    {item.year}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explore Research Action Button */}
                  <div className="pt-4 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => navigate(`/explore?q=${encodeURIComponent(station.searchKey)}`)}
                      className="ice-crystal-btn w-full py-2.5 px-4 rounded-2xl text-xs font-semibold inline-flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                    >
                      <span>Explore Research</span>
                      <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StationsPage;
