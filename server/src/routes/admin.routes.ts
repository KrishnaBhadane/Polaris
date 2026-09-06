import { Router } from 'express';
import {
  getPendingScientists,
  getScientistById,
  approveScientist,
  rejectScientist,
  getPendingContent,
  getAllContentAdmin,
  getContentByIdAdmin,
  approveContent,
  rejectContent,
  removeContentAdmin,
  getAdminMarqueeSettings,
  updateMarqueeSettings,
  createMarqueeNews,
  getAdminMarqueeNews,
  updateAdminMarqueeNews,
  deleteAdminMarqueeNews,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();

// Protect all admin routes with authentication and ADMIN role check
router.use(requireAuth, requireRole(UserRole.ADMIN));

// Marquee News management routes (Multi-announcement system)
router.post('/marquee-news', createMarqueeNews);
router.get('/marquee-news', getAdminMarqueeNews);
router.patch('/marquee-news/:id', updateAdminMarqueeNews);
router.delete('/marquee-news/:id', deleteAdminMarqueeNews);

// Legacy single marquee settings (preserved for backward compatibility if needed)
router.get('/settings/marquee', getAdminMarqueeSettings);
router.patch('/settings/marquee', updateMarqueeSettings);

// Scientist verification routes
router.get('/scientists/pending', getPendingScientists);
router.get('/scientists/:id', getScientistById);
router.patch('/scientists/:id/approve', approveScientist);
router.patch('/scientists/:id/reject', rejectScientist);

// Scientific content moderation routes
router.get('/content/pending', getPendingContent);
router.get('/content', getAllContentAdmin);
router.get('/content/:id', getContentByIdAdmin);
router.patch('/content/:id/approve', approveContent);
router.patch('/content/:id/reject', rejectContent);
router.patch('/content/:id/remove', removeContentAdmin);

export default router;
