import { getPresignedUrl, getTranscription } from '../controllers/videoControllers';
import express, { Router } from 'express';
import { rateLimiterByIp } from '../middlewares/rateLimiter';
import { addToWaitlist } from '../controllers/waitlistControllers';
import authRoutes from './authRoutes';
import healthRoute from './health';

const router: Router = express.Router();

router.use('/health',healthRoute)
router.use('/auth', authRoutes);

// API routes
router.put("/presigned", getPresignedUrl);
router.get("/transcribe", getTranscription);
router.post("/waitlist", addToWaitlist);

export default router;
