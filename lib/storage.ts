import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB cap

export interface DetectedFile {
  detectedMime: "application/pdf" | "image/png" | "image/jpeg";
  extension: "pdf" | "png" | "jpg";
}

/**
 * Inspect magic bytes to strictly derive MIME type.
 * Disallows SVG, HTML, scripts, and unapproved formats.
 */
export function detectMimeFromMagicBytes(buffer: Buffer): DetectedFile {
  if (buffer.length < 4) {
    throw new Error("Invalid file content: File is too small to determine format.");
  }

  // 1. PDF: %PDF (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { detectedMime: "application/pdf", extension: "pdf" };
  }

  // 2. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { detectedMime: "image/png", extension: "png" };
  }

  // 3. JPEG/JPG: 0xFF 0xD8 0xFF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { detectedMime: "image/jpeg", extension: "jpg" };
  }

  throw new Error(
    "Invalid file format: Only PDF, PNG, and JPEG documents are permitted. SVG, HTML, and executables are strictly rejected."
  );
}

/**
 * Sanitize client display filename
 */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  return clean || "document";
}

/**
 * StorageProvider Interface
 */
export interface StorageProvider {
  uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string>;
  getFile(key: string): Promise<{ data: Buffer; mimeType: string } | null>;
  deleteFile(key: string): Promise<void>;
  getSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
}

/**
 * Local Disk Provider (Dev only)
 */
export class LocalDiskStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), ".storage_private");
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // Ignore
    }
  }

  async uploadFile(buffer: Buffer, key: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return key;
  }

  async getFile(key: string): Promise<{ data: Buffer; mimeType: string } | null> {
    try {
      const filePath = path.join(this.baseDir, key);
      const data = await fs.readFile(filePath);
      const { detectedMime } = detectMimeFromMagicBytes(data);
      return { data, mimeType: detectedMime };
    } catch {
      return null;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, key);
      await fs.unlink(filePath);
    } catch {
      // Ignore if not present
    }
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const secret = process.env.AUTH_SECRET || "default_campusflow_secret_key";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${key}:${expires}`)
      .digest("hex");

    return `/api/files/download?key=${encodeURIComponent(key)}&expires=${expires}&signature=${signature}`;
  }
}

/**
 * S3 / R2 Compatible Storage Provider
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private endpoint: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "campusflow-proofs";
    this.endpoint = process.env.S3_ENDPOINT || "https://s3.amazonaws.com";
    this.region = process.env.S3_REGION || "us-east-1";
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    // S3 PUT via fetch or AWS SDK
    const url = `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "x-amz-acl": "private",
      },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) {
      throw new Error(`S3 upload failed: ${res.statusText}`);
    }
    return key;
  }

  async getFile(key: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const url = `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const { detectedMime } = detectMimeFromMagicBytes(data);
    return { data, mimeType: detectedMime };
  }

  async deleteFile(key: string): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`;
    await fetch(url, { method: "DELETE" });
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const secret = process.env.AUTH_SECRET || "default_campusflow_secret_key";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${key}:${expires}`)
      .digest("hex");

    return `/api/files/download?key=${encodeURIComponent(key)}&expires=${expires}&signature=${signature}`;
  }
}

/**
 * StorageProvider Factory
 */
export function getStorageProvider(): StorageProvider {
  if (process.env.STORAGE_PROVIDER === "s3") {
    return new S3StorageProvider();
  }
  return new LocalDiskStorageProvider();
}

/**
 * Verify HMAC signature on download tokens
 */
export function verifyDownloadToken(key: string, expires: number, signature: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (now > expires) return false;

  const secret = process.env.AUTH_SECRET || "default_campusflow_secret_key";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${key}:${expires}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

/**
 * Rate limit: Simple cap of 10 uploads per hour per user
 */
export async function assertUploadRateLimit(userId: string): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.upload.count({
    where: {
      uploaderId: userId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (count >= 10) {
    const error: any = new Error("Rate limit exceeded: You may upload a maximum of 10 files per hour.");
    error.status = 429;
    throw error;
  }
}

/**
 * Background cleanup: Delete unattached uploads older than 24 hours
 */
export async function cleanupStaleUploads(): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const staleUploads = await prisma.upload.findMany({
    where: {
      status: "UNATTACHED",
      createdAt: { lte: twentyFourHoursAgo },
    },
  });

  const storage = getStorageProvider();
  let deletedCount = 0;

  for (const upload of staleUploads) {
    try {
      await storage.deleteFile(upload.key);
      await prisma.upload.delete({ where: { id: upload.id } });
      deletedCount++;
    } catch (e) {
      console.error(`Failed to clean up stale upload ${upload.key}:`, e);
    }
  }

  return deletedCount;
}
