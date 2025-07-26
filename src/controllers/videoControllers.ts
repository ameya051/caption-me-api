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
import { customRequest } from "../types/customRequest";
import { db } from "../db";
import { videos } from "../db/schema";
import { desc, eq } from "drizzle-orm";

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

export const getVideoByUserId = async (req: customRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const videosList = await db
      .select()
      .from(videos)
      .where(eq(videos.userId,userId))
      .orderBy(desc(videos.createdAt))

    if (videosList.length === 0) {
      res.status(404).json({ message: "No videos found for this user" });
      return;
    }

    res.status(200).json(videosList);
  } catch (error) {

  }
}

export const createVideo = async (req: customRequest, res: Response) => {
  try {
    const { title, fileName, fileUrl } = req.body;
    if (!fileName || !fileUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const userId = req.user.id;
    const videoUrl=`https://caption-me-s3-bucket.s3.ap-south-1.amazonaws.com/${fileName}`;
    const [video]= await db.insert(videos).values({
      userId,
      title,
      fileName,
      url: videoUrl,
    }).returning();
    res.status(201).json(video);
  } catch (error) {
    logger.error("Error creating video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
