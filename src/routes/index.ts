import { getPresignedUrl, getTranscription } from '../controllers/videoControllers';
import express, { Router } from 'express';

const router: Router = express.Router();

router.put("/presigned", getPresignedUrl);
router.get("/transcribe",getTranscription)

export default router;
