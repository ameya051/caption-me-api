import { Request, Response, NextFunction } from "express";
import logger from "../logger";

const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log request
  logger.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Get start time
  const start = Date.now();

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`Completed ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

export default requestLogger;
