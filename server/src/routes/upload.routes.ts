import { Router } from 'express';
import {
  uploadScientificContent,
  uploadThumbnail,
} from '../controllers/upload.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { UserRole } from '../types/user.types';

const router = Router();

// POST /api/upload/thumbnail - Protected (SCIENTIST only)
router.post(
  '/thumbnail',
  requireAuth,
  requireRole(UserRole.SCIENTIST),
  upload.single('file'),
  uploadThumbnail
);

// POST /api/upload - Protected (SCIENTIST only)
router.post(
  '/',
  requireAuth,
  requireRole(UserRole.SCIENTIST),
  upload.single('file'),
  uploadScientificContent
);

export default router;
