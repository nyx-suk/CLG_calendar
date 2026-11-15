import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { baselines } = body; // Array of { subjectId, baselineConducted, baselineAttended }

    if (!Array.isArray(baselines)) {
      return NextResponse.json({ error: "Invalid baselines payload" }, { status: 400 });
    }

    // Upsert baseline records
    for (const b of baselines) {
      await prisma.attendanceBaseline.upsert({
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
    }

    return NextResponse.json({ success: true, message: "Baseline attendance updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
