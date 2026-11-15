import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  detectMimeFromMagicBytes,
  sanitizeFilename,
  getStorageProvider,
  assertUploadRateLimit,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const caller = await requireUser();

    // 1. Enforce rate limit (10 uploads per hour per user)
    await assertUploadRateLimit(caller.id);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    // 2. Enforce strict 4 MB file size cap
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 4 MB size limit. Please upload a smaller document." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Server-side magic bytes validation & MIME derivation (ignores client-supplied MIME)
    const { detectedMime, extension } = detectMimeFromMagicBytes(buffer);

    // 4. Server-generated random key and sanitized display filename
    const randomKey = `proofs/${caller.id}/${crypto.randomUUID()}.${extension}`;
    const sanitizedFileName = sanitizeFilename(file.name);

    // 5. Store file securely via storage provider
    const storage = getStorageProvider();
    await storage.uploadFile(buffer, randomKey, detectedMime);

    // 6. Record unattached upload in DB
    const upload = await prisma.upload.create({
      data: {
        key: randomKey,
        uploaderId: caller.id,
        size: buffer.length,
        detectedMime,
        sanitizedFileName,
        status: "UNATTACHED",
      },
    });

    return NextResponse.json({
      success: true,
      key: upload.key,
      detectedMime,
      size: upload.size,
      sanitizedFileName,
    });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
