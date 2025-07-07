import { authenticateJWT } from "middlewares/authMiddleware";
import {
  getPresignedUrl,
  getTranscription,
} from "../controllers/videoControllers";
import express, { Router } from "express";

const router: Router = express.Router();

// Get presigned URL for video upload to S3
// Requires authentication - validates file type (mp4) and size (max 50MB)
// Returns a temporary upload URL that expires in 60 seconds
router.put("/presigned", authenticateJWT, getPresignedUrl);

// Get transcription status or result for a video file
// Requires authentication - checks for existing transcription or job status
// Creates new transcription job if none exists
router.get("/transcribe", authenticateJWT, getTranscription);

export default router;
