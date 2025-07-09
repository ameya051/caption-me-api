import express, { Router } from 'express';
import { addToWaitlist } from '../controllers/waitlistControllers';
import authRoutes from './authRoutes';
import healthRoute from './health';
import videoRoutes from './videoRoutes';

const router: Router = express.Router();

router.use('/health',healthRoute)
router.use('/auth', authRoutes);
router.use("/video",videoRoutes)

// API routes
router.post("/waitlist", addToWaitlist);

export default router;
