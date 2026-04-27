import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
  console.warn("[R2] One or more Cloudflare R2 environment variables are missing. Image uploads will fail.");
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

export const uploadBufferToR2 = async (fileBuffer, originalName, mimeType, folder = "rooms") => {
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(
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

export const extractKeyFromUrl = (url) => {
  if (!url || !R2_PUBLIC_URL) return null;
  const prefix = R2_PUBLIC_URL.replace(/\/$/, "") + "/";
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
};

export const getPresignedUrl = async (key, expiresInSeconds = 900) => {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
};

export const uploadMultipleToR2 = async (files = []) => {
  if (!files.length) return [];

  const uploads = files.map((file) =>
    uploadBufferToR2(file.buffer, file.originalname, file.mimetype),
  );

  return Promise.all(uploads);
};
