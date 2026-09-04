import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import scientistRoutes from './scientist.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Register sub-routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/scientist', scientistRoutes);
router.use('/admin', adminRoutes);

export default router;
