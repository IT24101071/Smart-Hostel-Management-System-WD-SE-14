import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const {
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

if (
  !R2_ENDPOINT ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME ||
  !R2_PUBLIC_URL
) {
  throw new Error("Missing Cloudflare R2 environment variables");
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

export const uploadBufferToR2 = async (fileBuffer, originalName, mimeType) => {
  const key = `rooms/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(
    originalName,
  )}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    }),
  );

  return `${R2_PUBLIC_URL}/${key}`;
};

export const uploadMultipleToR2 = async (files = []) => {
  if (!files.length) return [];

  const uploads = files.map((file) =>
    uploadBufferToR2(file.buffer, file.originalname, file.mimetype),
  );

  return Promise.all(uploads);
};
