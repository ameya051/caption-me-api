import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetTranscriptionJobCommand, StartTranscriptionJobCommand, TranscribeClient } from "@aws-sdk/client-transcribe";
import dotenv from 'dotenv';
import logger from '../logger'

dotenv.config();

const transcribeClient = new TranscribeClient({
    region: process.env.BUCKET_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY!,
        secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
});

function createTranscriptionCommand(
    filename: string
): StartTranscriptionJobCommand {
    return new StartTranscriptionJobCommand({
        TranscriptionJobName: filename,
        OutputBucketName: process.env.BUCKET_NAME as string,
        OutputKey: filename + ".transcription",
        IdentifyLanguage: true,
        Media: {
            MediaFileUri: "s3://" + process.env.BUCKET_NAME + "/" + filename,
        },
    });
}

export async function createTranscriptionJob(filename: string): Promise<any> {
    // const transcribeClient = getClient();
    const transcriptionCommand = createTranscriptionCommand(filename);
    return transcribeClient.send(transcriptionCommand);
}

export async function getJob(filename: string): Promise<any> {
    // const transcribeClient = getClient();
    let jobStatusResult = null;
    try {
        const transcriptionJobStatusCommand = new GetTranscriptionJobCommand({
            TranscriptionJobName: filename,
        });
        jobStatusResult = await transcribeClient.send(
            transcriptionJobStatusCommand
        );
    } catch (e) {
    }
    return jobStatusResult;
}

async function streamToString(stream: any): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        stream.on("error", reject);
    });
}

/**
 * Function to get the transcribed file from the s3 bucket if it exists dont create any transcribing job
 * @param filename
 * @returns
 */
export async function getTranscriptionFile(filename: string): Promise<any> {
    const transcriptionFile = filename + ".transcription";

    const s3client = new S3Client({
        region: "ap-south-1",
        credentials: {
            accessKeyId: process.env.ACCESS_KEY as string,
            secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
        },
    });
    const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME as string,
        Key: transcriptionFile,
    });

    let transcriptionFileResponse = null;

    try {
        transcriptionFileResponse = await s3client.send(getObjectCommand);
    } catch (e) {
        logger.error(e);
    }
    if (transcriptionFileResponse) {
        return JSON.parse(await streamToString(transcriptionFileResponse.Body));
    }
    return null;
}
