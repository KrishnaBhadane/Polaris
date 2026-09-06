import { Router } from 'express';
import {
  getPublicContent,
  getRecentContent,
  getPublicContentById,
  searchPublicContent,
  getPublicExpeditions,
  getPublicExpeditionBySlug,
  getPublicMarqueeAnnouncement,
  getPublicMarqueeNews,
} from '../controllers/public.controller';

const router = Router();

// Public Marquee News (Multi-announcement system)
router.get('/marquee-news', getPublicMarqueeNews);

// Legacy public site settings / announcement
router.get('/settings/marquee', getPublicMarqueeAnnouncement);

// Public search and browsing routes (no authentication required)
router.get('/search', searchPublicContent);
router.get('/content', getPublicContent);
router.get('/content/recent', getRecentContent);
router.get('/content/:id', getPublicContentById);

// Expedition hub routes
router.get('/expeditions', getPublicExpeditions);
router.get('/expeditions/:slug', getPublicExpeditionBySlug);

export default router;
