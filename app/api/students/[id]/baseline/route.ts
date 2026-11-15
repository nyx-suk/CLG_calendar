import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const caller = await requireUser();

    if (caller.role === "STUDENT") {
      // IDOR defense: Student can only modify their own baselines
      if (caller.id !== id) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      // Check onboarding invariant: baselines can only be set if not already present
      const body = await req.json();
      const { baselines } = body;

      if (!Array.isArray(baselines)) {
        return NextResponse.json({ error: "Invalid baselines payload" }, { status: 400 });
      }

      for (const b of baselines) {
        const existing = await prisma.attendanceBaseline.findUnique({
          where: {
            studentId_subjectId: {
              studentId: id,
              subjectId: b.subjectId,
            },
          },
        });
        if (existing) {
          return NextResponse.json(
            { error: "Baselines already exist. Only coordinators may update established baselines." },
            { status: 403 }
          );
        }
      }

      // Perform upserts and write audit logs
      for (const b of baselines) {
        const baselineRecord = await prisma.attendanceBaseline.upsert({
          where: {
            studentId_subjectId: {
              studentId: id,
              subjectId: b.subjectId,
            },
          },
          update: {
            baselineConducted: Number(b.baselineConducted) || 0,
            baselineAttended: Number(b.baselineAttended) || 0,
            asOfDate: new Date(),
          },
          create: {
            studentId: id,
            subjectId: b.subjectId,
            baselineConducted: Number(b.baselineConducted) || 0,
            baselineAttended: Number(b.baselineAttended) || 0,
          },
        });

        await prisma.baselineAuditLog.create({
          data: {
            baselineId: baselineRecord.id,
            studentId: id,
            subjectId: b.subjectId,
            changedById: caller.id,
            oldConducted: 0,
            oldAttended: 0,
            newConducted: Number(b.baselineConducted) || 0,
            newAttended: Number(b.baselineAttended) || 0,
          },
        });
      }

      return NextResponse.json({ success: true, message: "Baseline attendance established successfully" });
    } else if (caller.role === "COORDINATOR") {
      const student = await prisma.user.findFirst({ where: { id, role: "STUDENT" } });
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const body = await req.json();
      const { baselines } = body;

      if (!Array.isArray(baselines)) {
        return NextResponse.json({ error: "Invalid baselines payload" }, { status: 400 });
      }

      for (const b of baselines) {
        const existing = await prisma.attendanceBaseline.findUnique({
          where: {
            studentId_subjectId: {
              studentId: id,
              subjectId: b.subjectId,
            },
          },
        });

        const oldConducted = existing?.baselineConducted ?? 0;
        const oldAttended = existing?.baselineAttended ?? 0;
        const newConducted = Number(b.baselineConducted) || 0;
        const newAttended = Number(b.baselineAttended) || 0;

        const baselineRecord = await prisma.attendanceBaseline.upsert({
          where: {
            studentId_subjectId: {
              studentId: id,
              subjectId: b.subjectId,
            },
          },
          update: {
            baselineConducted: newConducted,
            baselineAttended: newAttended,
            asOfDate: new Date(),
          },
          create: {
            studentId: id,
            subjectId: b.subjectId,
            baselineConducted: newConducted,
            baselineAttended: newAttended,
          },
        });

        await prisma.baselineAuditLog.create({
          data: {
            baselineId: baselineRecord.id,
            studentId: id,
            subjectId: b.subjectId,
            changedById: caller.id,
            oldConducted,
            oldAttended,
            newConducted,
            newAttended,
          },
        });
      }

      return NextResponse.json({ success: true, message: "Baseline attendance updated by coordinator" });
    } else {
      // Mentors and Lecturers cannot modify baselines
      return NextResponse.json({ error: "Forbidden: Insufficient privileges" }, { status: 403 });
    }
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
