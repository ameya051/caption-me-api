import { getPresignedUrl } from '../controllers/videoControllers';
import express, { Request, Response,Router } from 'express';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const router: Router = express.Router();

// Define routes
router.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the API' });
});

router.put("/presigned", getPresignedUrl);

export default router;
