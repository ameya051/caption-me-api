import { getPresignedUrl, getTranscription } from '../controllers/videoControllers';
import express, { Router } from 'express';
import { rateLimiterByIp } from '../middlewares/rateLimiter';
import { addToWaitlist } from '../controllers/waitlistControllers';

const router: Router = express.Router();

router.put("/presigned",rateLimiterByIp, getPresignedUrl);
router.get("/transcribe",getTranscription)
router.post("/waitlist", addToWaitlist)

export default router;
