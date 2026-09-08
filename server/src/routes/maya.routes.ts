import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { chatWithMayaHandler, generateMayaTtsHandler } from '../controllers/maya.controller';

const router = Router();

// POST /api/maya/chat
router.post('/chat', requireAuth, chatWithMayaHandler);

// POST /api/maya/tts
router.post('/tts', requireAuth, generateMayaTtsHandler);

export default router;
