import { authenticateJWT } from "../middlewares/authMiddleware";
import {
  getPresignedUrl,
  getTranscription,
} from "../controllers/videoControllers";
import express, { Router } from "express";
import { rateLimiter } from "../middlewares/rateLimiter";

const router: Router = express.Router();
router.put("/presigned", authenticateJWT, rateLimiter, getPresignedUrl);
router.get("/transcribe", authenticateJWT, getTranscription);

export default router;
