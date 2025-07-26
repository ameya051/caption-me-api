import { authenticateJWT } from "../middlewares/authMiddleware";
import {
  createVideo,
  getPresignedUrl,
  getTranscription,
} from "../controllers/videoControllers";
import express, { Router } from "express";
import { rateLimiter } from "../middlewares/rateLimiter";

const router: Router = express.Router();
router.get("/transcribe", authenticateJWT, getTranscription);
router.put("/presigned", authenticateJWT, rateLimiter, getPresignedUrl);
router.post('/', authenticateJWT, rateLimiter, createVideo);

export default router;
