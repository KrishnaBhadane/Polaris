import { Router } from 'express';
import {
  applyScientist,
  getScientistStatus,
  uploadScientistIdProof,
  getScientistIdProof,
} from '../controllers/scientist.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Scientist ID proof secure upload & signed access
router.post('/id-proof', requireAuth, upload.single('file'), uploadScientistIdProof);
router.get('/id-proof/:applicationId', requireAuth, getScientistIdProof);

// Scientist application lifecycle
router.post('/apply', requireAuth, applyScientist);
router.get('/status', requireAuth, getScientistStatus);

export default router;


