import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { verifyDownloadToken, getStorageProvider } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const caller = await requireUser();
    const url = new URL(req.url);

    const key = url.searchParams.get("key");
    const expiresStr = url.searchParams.get("expires");
    const signature = url.searchParams.get("signature");

    if (!key || !expiresStr || !signature) {
      return NextResponse.json({ error: "Missing signed URL parameters" }, { status: 400 });
    }

    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires)) {
      return NextResponse.json({ error: "Invalid expiry timestamp" }, { status: 400 });
    }

    // 1. Verify HMAC cryptographic signature and expiration
    const isValidToken = verifyDownloadToken(key, expires, signature);
    if (!isValidToken) {
      return NextResponse.json({ error: "Forbidden: Signed URL is invalid or expired" }, { status: 403 });
    }

    // 2. Locate associated event application
    const application = await prisma.eventApplication.findFirst({
      where: { proofFileKey: key },
      include: { student: true },
    });

    if (!application) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 3. Strict access control & sensitivity barrier:
    // - Applicant student: ALLOWED
    // - Assigned mentor: ALLOWED
    // - Coordinator: ALLOWED
    // - LECTURERS: STRICTLY BARRED (especially medical slips) -> 404
    // - Any other user: 404
    const isApplicant = application.studentId === caller.id;
    const isAssignedMentor = caller.role === "MENTOR" && application.student.mentorId === caller.id;
    const isCoordinator = caller.role === "COORDINATOR";

    if (!isApplicant && !isAssignedMentor && !isCoordinator) {
      // Returns 404 to avoid resource enumeration / information leakage
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 4. Retrieve file from storage provider
    const storage = getStorageProvider();
    const fileResult = await storage.getFile(key);

    if (!fileResult) {
      return NextResponse.json({ error: "File object not found in storage" }, { status: 404 });
    }

    // 5. Log download audit record (Amendment 9)
    await prisma.fileDownloadLog.create({
      data: {
        userId: caller.id,
        applicationId: application.id,
        fileKey: key,
      },
    });

    // 6. Serve with secure headers
    const sanitizedName = application.proofOriginalName || "proof-document";
    const headers = new Headers();
    headers.set("Content-Type", fileResult.mimeType);
    headers.set("Content-Disposition", `attachment; filename="${sanitizedName}"`);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

    return new NextResponse(new Uint8Array(fileResult.data), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
