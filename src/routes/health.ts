import { Router, Request, Response } from "express";
import logger from "../logger";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const healthCheck = {
      status: "healthy",
      timestamp: new Date(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };

    logger.info("Health check passed", healthCheck);
    res.status(200).json(healthCheck);
  } catch (error) {
    const errorResponse = {
      status: "unhealthy",
      timestamp: new Date(),
      error: error.message,
    };

    logger.error("Health check failed", errorResponse);
    res.status(503).json(errorResponse);
  }
});

export default router;
