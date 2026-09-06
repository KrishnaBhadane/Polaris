import { Router } from 'express';
import {
  generateSummary,
  generateOutreach,
  generateWorkspaceSummary,
} from '../controllers/ai.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { aiRateLimiter, workspaceAiRateLimiter } from '../middlewares/rateLimit.middleware';
import { upload } from '../middlewares/upload.middleware';
import { UserRole } from '../types/user.types';

const router = Router();

// POST /api/ai/summary/:contentId - AI Research Summaries (QUICK, STUDENT, TECHNICAL)
router.post('/summary/:contentId', requireAuth, aiRateLimiter, generateSummary);

// POST /api/ai/outreach/:contentId - AI Outreach Studio (WEBSITE, LINKEDIN, X, INSTAGRAM, STUDENT)
router.post(
  '/outreach/:contentId',
  requireAuth,
  requireRole(UserRole.SCIENTIST, UserRole.ADMIN),
  aiRateLimiter,
  generateOutreach
);

// POST /api/ai/workspace-summary - User Workspace Temporary AI Summaries (PDF, IMAGE, VIDEO, LINK)
router.post(
  '/workspace-summary',
  requireAuth,
  workspaceAiRateLimiter,
  upload.single('file'),
  generateWorkspaceSummary
);

export default router;

