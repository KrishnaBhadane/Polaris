import { Router } from 'express';
import {
  getPendingScientists,
  getScientistById,
  approveScientist,
  rejectScientist,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();

// Protect all admin routes with authentication and ADMIN role check
router.use(requireAuth, requireRole(UserRole.ADMIN));

router.get('/scientists/pending', getPendingScientists);
router.get('/scientists/:id', getScientistById);
router.patch('/scientists/:id/approve', approveScientist);
router.patch('/scientists/:id/reject', rejectScientist);

export default router;
