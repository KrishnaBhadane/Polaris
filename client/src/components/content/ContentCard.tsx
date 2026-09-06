import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, Database, Image as ImageIcon, Film, Activity, ArrowUpRight } from 'lucide-react';
import type { IContentItem, ContentType } from '../../types/content.types';
import { ContentTypeFallback } from './ContentTypeFallback';

interface ContentCardProps {
  item: IContentItem;
}

const getTypeIcon = (type: ContentType) => {
  switch (type) {
    case 'REPORT':
      return <FileText className="w-4 h-4" />;
    case 'PUBLICATION':
      return <BookOpen className="w-4 h-4" />;
    case 'DATASET':
      return <Database className="w-4 h-4" />;
    case 'IMAGE':
      return <ImageIcon className="w-4 h-4" />;
    case 'VIDEO':
      return <Film className="w-4 h-4" />;
    case 'ACTIVITY':
      return <Activity className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

export const ContentCard: React.FC<ContentCardProps> = ({ item }) => {
  const [imgError, setImgError] = useState(false);

  // Priority: 1. IMAGE content actual image/file preview, 2. custom thumbnailUrl, 3. fallback
  const previewImg =
    item.type === 'IMAGE'
      ? item.fileUrl || item.thumbnailUrl
      : item.thumbnailUrl || undefined;

  const showImage = Boolean(previewImg && !imgError);

  return (
    <Link
      to={`/content/${item._id}`}
      className="group flex flex-col bg-white border border-neutral-200/90 rounded-2xl overflow-hidden hover:border-sky-400/80 hover:shadow-lg transition-all duration-200"
    >
      {/* Thumbnail or Content-Type Fallback Visual */}
      <div className="relative w-full aspect-[16/10] bg-neutral-900 overflow-hidden flex items-center justify-center border-b border-neutral-100">
        {showImage && previewImg ? (
          <img
            src={previewImg}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ContentTypeFallback type={item.type} />
        )}


        {/* Type Badge */}
        <div className="absolute top-3 left-3 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-neutral-200/80 text-[10px] font-bold tracking-wider uppercase text-neutral-800 shadow-sm">
          <span className="text-sky-600">{getTypeIcon(item.type)}</span>
          <span>{item.type}</span>
        </div>

        {/* Hover Arrow Icon */}
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Card Content Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
            {item.title}
          </h3>
        </div>

        {/* Footer: Scientist Name & Year */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <span className="truncate max-w-[180px] font-medium text-neutral-700">
            {item.scientistName}
          </span>
          <span className="font-mono text-neutral-400 shrink-0">
            {item.year || (item.createdAt ? new Date(item.createdAt).getFullYear() : '—')}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ContentCard;
