import { Request, Response } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import {
  createTranscriptionJob,
  getJob,
  getTranscriptionFile,
} from "../util/transcribeHelpers";
import logger from "../logger";

export const getPresignedUrl = async (req: Request, res: Response) => {
  try {
    const { fileName, fileSize, fileType } = req.query;
    if (fileType !== "video/mp4") {
      res.status(400).json({ error: "Invalid file format" });
      return;
    }

    if (parseInt(fileSize as string) > 52428800) {
      res.status(400).json({
        error: "Invalid file size. Upload files smaller than 50 MB",
      });
      return;
    }

    const s3Client = new S3Client({
      region: process.env.BUCKET_REGION,
      credentials: {
        accessKeyId: process.env.ACCESS_KEY!,
        secretAccessKey: process.env.SECRET_ACCESS_KEY!,
      },
    });

    const generateFileName = (bytes = 32) =>
      crypto.randomBytes(bytes).toString("hex");

    // const fileName = generateFileName();

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: fileName as string,
    });

    const url = await getSignedUrl(
      s3Client,
      putObjectCommand,
      { expiresIn: 60 } // 60 seconds
    );

    res.status(200).json({ url, fileName });
  } catch (error) {
    res.status(500).json({ error: "Error uploading file" });
  }
};

export const getTranscription = async (req: Request, res: Response) => {
  try {
    const filename = req.query.filename as string;

    if (!filename) {
      res.status(400).json({ error: "Filename is required" });
      return;
    }

    // 1. find ready transcription first in the bucket
    const transcription = await getTranscriptionFile(filename);
    if (transcription) {
      res.json({
        status: "COMPLETED",
        transcription,
      });
      return;
    }

    // 2. check if already transcribing
    const existingJob = await getJob(filename);

    // 3. if job exists return the status code
    if (existingJob) {
      res.json({
        status: existingJob.TranscriptionJob.TranscriptionJobStatus,
      });
      return;
    }

    // 4. creating new transcription job
    const newJob = await createTranscriptionJob(filename);
    res.json({
      status: newJob.TranscriptionJob.TranscriptionJobStatus,
    });
  } catch (error) {
    logger.error("Transcription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
