import { Router } from 'express';
import {
  createContent,
  getMyContent,
  getContentById,
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

export default router;
