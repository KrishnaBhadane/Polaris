import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import scientistRoutes from './scientist.routes';
import adminRoutes from './admin.routes';
import contentRoutes from './content.routes';
import publicRoutes from './public.routes';
import uploadRoutes from './upload.routes';
import aiRoutes from './ai.routes';

const router = Router();

// Register sub-routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/scientist', scientistRoutes);
router.use('/admin', adminRoutes);
router.use('/content', contentRoutes);
router.use('/public', publicRoutes);
router.use('/upload', uploadRoutes);
router.use('/ai', aiRoutes);

export default router;



