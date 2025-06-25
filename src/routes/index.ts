import { getPresignedUrl, getTranscription } from '../controllers/videoControllers';
import express, { Router } from 'express';
import { rateLimiterByIp } from '../middlewares/rateLimiter';
import { addToWaitlist } from '../controllers/waitlistControllers';
import authRoutes from './authRoutes';

const router: Router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// API routes
router.put("/presigned", getPresignedUrl);
router.get("/transcribe", getTranscription);
router.post("/waitlist", addToWaitlist);

export default router;
