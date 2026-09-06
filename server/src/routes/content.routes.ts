import { Router } from 'express';
import {
  createContent,
  getMyContent,
  getContentById,
  removeMyContent,
} from '../controllers/content.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();

// 1. Submit content (SCIENTIST only)
router.post('/', requireAuth, requireRole(UserRole.SCIENTIST), createContent);

// 2. View own submissions (SCIENTIST only)
router.get('/mine', requireAuth, requireRole(UserRole.SCIENTIST), getMyContent);

// 3. View submission by ID (SCIENTIST own submission or ADMIN)
router.get('/:id', requireAuth, getContentById);

// 4. Soft remove submission (SCIENTIST own submission only)
router.patch('/:id/remove', requireAuth, requireRole(UserRole.SCIENTIST), removeMyContent);

export default router;
