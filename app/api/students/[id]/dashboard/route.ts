import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeSubjectAttendance,
  categorizeTier,
  AttendanceStats,
} from "@/lib/attendance-calculator";
import { resolveStudentDaySchedule } from "@/lib/calendar-generator";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") || "2026-10-19";

    const student = await prisma.user.findUnique({
      where: { id },
      include: {
        mentor: true,
        baselines: {
          include: { subject: true },
        },
        applications: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student || student.role !== "STUDENT") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 1. Fetch all subjects
    const subjects = await prisma.subject.findMany({
      include: { lecturer: true },
      orderBy: { code: "asc" },
    });

    // 2. Fetch class attendance records for ongoing classes
    const attendanceRecords = await prisma.classAttendanceRecord.findMany({
      where: { studentId: id },
    });

    // 3. Compute stats for each subject
    const subjectStats: AttendanceStats[] = subjects.map((sub) => {
      const baseline = student.baselines.find((b) => b.subjectId === sub.id);
      const baselineConducted = baseline?.baselineConducted ?? 0;
      const baselineAttended = baseline?.baselineAttended ?? 0;

      const subRecords = attendanceRecords.filter((r) => r.subjectId === sub.id);
      const ongoingConducted = subRecords.length;
      const ongoingAttended = subRecords.filter((r) => r.status === "ATTENDED").length;
      const ongoingOD = subRecords.filter((r) => r.status === "ON_DUTY").length;

      return computeSubjectAttendance({
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        importance: sub.importance as any,
        baselineConducted,
        baselineAttended,
        ongoingConducted,
        ongoingAttended,
        ongoingOD,
      });
    });

    // Aggregate overall percentages
    const totalConducted = subjectStats.reduce((acc, s) => acc + s.totalConducted, 0);
    const totalPhysical = subjectStats.reduce((acc, s) => acc + s.physicallyAttended, 0);
    const totalOD = subjectStats.reduce((acc, s) => acc + s.odApproved, 0);

    const overallPhysicalPercentage = totalConducted > 0
      ? Number(((totalPhysical / totalConducted) * 100).toFixed(1))
      : 100;
    const overallODPercentage = totalConducted > 0
      ? Number((Math.min(100, ((totalPhysical + totalOD) / totalConducted) * 100)).toFixed(1))
      : 100;

    const { tier: overallTier, description: overallTierDescription } =
      categorizeTier(overallODPercentage);

    // 4. Resolve calendar schedule for the requested date
    const daySchedule = await resolveStudentDaySchedule({
      studentId: id,
      section: student.section || "5A",
      dateStr,
    });

    // 5. Fetch upcoming public extracurricular events
    const catalogEvents = await prisma.extracurricularEvent.findMany({
      where: { isPublicListing: true },
      orderBy: { startDate: "asc" },
    });

    // 6. Fetch COE calendar events for general awareness
    const coeEvents = await prisma.cOEEvent.findMany({
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        department: student.department,
        semester: student.semester,
        section: student.section,
        githubUsername: student.githubUsername,
        mentor: student.mentor,
      },
      attendance: {
        overallPhysicalPercentage,
        overallODPercentage,
        overallTier,
        overallTierDescription,
        subjects: subjectStats,
      },
      daySchedule,
      applications: student.applications,
      catalogEvents,
      coeEvents,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
