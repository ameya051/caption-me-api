import { getPresignedUrl, getTranscription } from '../controllers/videoControllers';
import express, { Router } from 'express';
import { rateLimiterByIp } from '../middlewares/rateLimiter';

const router: Router = express.Router();

router.put("/presigned",rateLimiterByIp, getPresignedUrl);
router.get("/transcribe",getTranscription)

export default router;
