import { Router } from 'express';
import {
  applyScientist,
  getScientistStatus,
} from '../controllers/scientist.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/apply', requireAuth, applyScientist);
router.get('/status', requireAuth, getScientistStatus);

export default router;
