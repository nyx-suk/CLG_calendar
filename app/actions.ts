"use server";

import { prisma } from "@/lib/prisma";
import {
  computeSubjectAttendance,
  categorizeTier,
  simulateMissImpact,
  AttendanceStats,
} from "@/lib/attendance-calculator";
import { resolveStudentDaySchedule } from "@/lib/calendar-generator";
import { verifyGitHubProjectCommits } from "@/lib/github-verifier";
import { revalidatePath } from "next/cache";

// 1. Get all demo users for role switching
export async function getUsersAndRoles() {
  const users = await prisma.user.findMany({
    include: {
      mentor: true,
      subjectsTaught: true,
    },
    orderBy: {
      role: "asc",
    },
  });
  return users;
}

// 2. Fetch full student dashboard data
export async function getStudentDashboard(studentId: string, dateStr: string = "2026-10-19") {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
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

  if (!student) throw new Error("Student not found");

  const subjects = await prisma.subject.findMany({
    include: { lecturer: true },
    orderBy: { code: "asc" },
  });

  const attendanceRecords = await prisma.classAttendanceRecord.findMany({
    where: { studentId },
  });

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

  const daySchedule = await resolveStudentDaySchedule({
    studentId,
    section: student.section || "5A",
    dateStr,
  });

  const catalogEvents = await prisma.extracurricularEvent.findMany({
    where: { isPublicListing: true },
    orderBy: { startDate: "asc" },
  });

  const coeEvents = await prisma.cOEEvent.findMany({
    orderBy: { date: "asc" },
  });

  return {
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
  };
}

// 3. Update Mid-Semester Baseline Attendance
export async function updateBaselines(
  studentId: string,
  baselines: { subjectId: string; baselineConducted: number; baselineAttended: number }[]
) {
  for (const b of baselines) {
    await prisma.attendanceBaseline.upsert({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId: b.subjectId,
        },
      },
      update: {
        baselineConducted: Number(b.baselineConducted) || 0,
        baselineAttended: Number(b.baselineAttended) || 0,
        asOfDate: new Date(),
      },
      create: {
        studentId,
        subjectId: b.subjectId,
        baselineConducted: Number(b.baselineConducted) || 0,
        baselineAttended: Number(b.baselineAttended) || 0,
      },
    });
  }
  revalidatePath("/");
  return { success: true };
}

// 4. File an Event Application (with optional GitHub commit inspection)
export async function fileEventApplication(data: {
  studentId: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  description?: string;
  proofType?: string;
  proofUrl?: string;
  githubRepoUrl?: string;
  githubUsername?: string;
}) {
  let githubCommitCount: number | null = null;
  let githubSummary: string | null = null;

  if (data.proofType === "GITHUB_REPO" && data.githubRepoUrl) {
    const ghResult = await verifyGitHubProjectCommits({
      repoUrl: data.githubRepoUrl,
      username: data.githubUsername,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    githubCommitCount = ghResult.commitCount;
    githubSummary = ghResult.summaryText;
  }

  const application = await prisma.eventApplication.create({
    data: {
      studentId: data.studentId,
      title: data.title,
      category: data.category,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      description: data.description || null,
      proofType: data.proofType || null,
      proofUrl: data.proofUrl || null,
      githubRepoUrl: data.githubRepoUrl || null,
      githubUsername: data.githubUsername || null,
      githubCommitCount,
      githubSummary,
      status: "PENDING_APPROVAL",
      proofVerified: false,
    },
  });

  revalidatePath("/");
  return { success: true, application };
}

// 5. Safe-to-Miss Simulator
export async function simulateEvent(params: {
  currentStats: AttendanceStats;
  missedClasses: number;
  isCoveredByOD: boolean;
}) {
  return simulateMissImpact(params.currentStats, params.missedClasses, params.isCoveredByOD);
}

// 6. Mentor: Fetch applications and mentee health
export async function getMentorDashboard(mentorId: string) {
  const mentor = await prisma.user.findUnique({
    where: { id: mentorId },
  });

  const applications = await prisma.eventApplication.findMany({
    where: {
      student: { mentorId },
    },
    include: {
      student: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const mentees = await prisma.user.findMany({
    where: { mentorId },
    include: {
      baselines: { include: { subject: true } },
      applications: true,
    },
  });

  // Calculate mentee health summaries
  const menteeSummaries = await Promise.all(
    mentees.map(async (m) => {
      const records = await prisma.classAttendanceRecord.findMany({
        where: { studentId: m.id },
      });
      const baselineConducted = m.baselines.reduce((acc, b) => acc + b.baselineConducted, 0);
      const baselineAttended = m.baselines.reduce((acc, b) => acc + b.baselineAttended, 0);
      const ongoingAttended = records.filter((r) => r.status === "ATTENDED").length;
      const ongoingOD = records.filter((r) => r.status === "ON_DUTY").length;
      const totalConducted = baselineConducted + records.length;
      const totalPhysical = baselineAttended + ongoingAttended;
      const totalOD = totalPhysical + ongoingOD;

      const physicalPercentage = totalConducted > 0
        ? Number(((totalPhysical / totalConducted) * 100).toFixed(1))
        : 100;
      const odPercentage = totalConducted > 0
        ? Number((Math.min(100, (totalOD / totalConducted) * 100)).toFixed(1))
        : 100;

      const { tier, description } = categorizeTier(odPercentage);

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        rollNumber: m.rollNumber,
        section: m.section,
        physicalPercentage,
        odPercentage,
        tier,
        tierDescription: description,
        pendingAppsCount: m.applications.filter((a) => a.status === "PENDING_APPROVAL").length,
      };
    })
  );

  return {
    mentor,
    applications,
    menteeSummaries,
  };
}

// 7. Mentor: Review Application (Approve / Reject / Validate Proof & Credit OD)
export async function reviewApplication(params: {
  applicationId: string;
  action: "APPROVE" | "REJECT";
  remarks?: string;
  markProofVerified?: boolean;
}) {
  const { applicationId, action, remarks, markProofVerified } = params;

  const app = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    include: { student: true },
  });

  if (!app) throw new Error("Application not found");

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.eventApplication.update({
    where: { id: applicationId },
    data: {
      status: newStatus,
      mentorRemarks: remarks || (action === "APPROVE" ? "Approved by mentor." : "Rejected by mentor."),
      proofVerified: markProofVerified ?? (action === "APPROVE" && !!app.proofUrl || !!app.githubRepoUrl),
    },
  });

  // If approved, create/credit ON_DUTY records for matching slots during event duration
  if (action === "APPROVE") {
    const startDate = new Date(app.startDate);
    const endDate = new Date(app.endDate);

    // Loop through each date of the event
    const curDate = new Date(startDate);
    while (curDate <= endDate) {
      const dateStr = curDate.toISOString().split("T")[0];
      const jsDay = curDate.getUTCDay();
      const baseDayOfWeek = jsDay === 0 ? 7 : jsDay;

      // Check for COE swap
      const coeEvent = await prisma.cOEEvent.findFirst({ where: { date: dateStr } });
      let effectiveDay = baseDayOfWeek;
      if (coeEvent && coeEvent.type === "TIMETABLE_SWAP" && coeEvent.swapDayOfWeek) {
        effectiveDay = coeEvent.swapDayOfWeek;
      }

      if (effectiveDay !== 7 && (!coeEvent || coeEvent.type !== "HOLIDAY")) {
        // Fetch timetable slots for this section and day
        const slots = await prisma.timetableSlot.findMany({
          where: {
            section: app.student.section || "5A",
            dayOfWeek: effectiveDay,
          },
        });

        for (const slot of slots) {
          await prisma.classAttendanceRecord.upsert({
            where: {
              studentId_subjectId_date_slotStartTime: {
                studentId: app.studentId,
                subjectId: slot.subjectId,
                date: dateStr,
                slotStartTime: slot.startTime,
              },
            },
            update: {
              status: "ON_DUTY",
              applicationId: app.id,
            },
            create: {
              studentId: app.studentId,
              subjectId: slot.subjectId,
              date: dateStr,
              slotStartTime: slot.startTime,
              status: "ON_DUTY",
              applicationId: app.id,
            },
          });
        }
      }
      curDate.setDate(curDate.getDate() + 1);
    }
  }

  revalidatePath("/");
  return { success: true };
}

// 8. Lecturer: Transparency view to avoid prejudice
export async function getLecturerRoster(lecturerId: string, dateStr: string = "2026-10-19") {
  const lecturer = await prisma.user.findUnique({
    where: { id: lecturerId },
    include: {
      subjectsTaught: true,
    },
  });

  if (!lecturer) throw new Error("Lecturer not found");

  const subjectIds = lecturer.subjectsTaught.map((s) => s.id);

  // Get all students enrolled in section 5A
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: {
      mentor: true,
      applications: {
        where: {
          startDate: { lte: new Date(`${dateStr}T23:59:59.999Z`) },
          endDate: { gte: new Date(`${dateStr}T00:00:00.000Z`) },
        },
      },
      attendanceRecords: {
        where: {
          date: dateStr,
          subjectId: { in: subjectIds },
        },
        include: { application: true },
      },
    },
  });

  const roster = students.map((st) => {
    const todayRecords = st.attendanceRecords;
    const activeApp = st.applications[0];

    let displayStatus = "Present in Class";
    let statusBadge: "PRESENT" | "ON_DUTY" | "ABSENT" = "PRESENT";
    let contextNote = "Attending regular lectures";

    if (todayRecords.some((r) => r.status === "ON_DUTY") || (activeApp && activeApp.status === "APPROVED")) {
      statusBadge = "ON_DUTY";
      displayStatus = `On-Duty: ${activeApp?.title || "Approved Extracurricular"}`;
      contextNote = `Student is officially participating in ${activeApp?.category || "Event"} (Approved by Mentor ${st.mentor?.name || ""}).`;
    } else if (todayRecords.some((r) => r.status === "ABSENT")) {
      statusBadge = "ABSENT";
      displayStatus = "Unexcused Absence";
      contextNote = "No verified OD on record for this slot. Recommended to follow up with mentor or student.";
    }

    return {
      studentId: st.id,
      name: st.name,
      rollNumber: st.rollNumber,
      section: st.section,
      githubUsername: st.githubUsername,
      mentorName: st.mentor?.name,
      mentorEmail: st.mentor?.email,
      displayStatus,
      statusBadge,
      contextNote,
      activeApplication: activeApp
        ? {
            title: activeApp.title,
            category: activeApp.category,
            proofType: activeApp.proofType,
            githubRepoUrl: activeApp.githubRepoUrl,
            githubCommitCount: activeApp.githubCommitCount,
            status: activeApp.status,
          }
        : null,
    };
  });

  return {
    lecturer,
    subjects: lecturer.subjectsTaught,
    dateStr,
    roster,
  };
}

// 9. Coordinator: Audit console
export async function getCoordinatorAudit() {
  const coordinator = await prisma.user.findFirst({
    where: { role: "COORDINATOR" },
  });

  const applications = await prisma.eventApplication.findMany({
    include: {
      student: {
        include: { mentor: true },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return {
    coordinator,
    applications,
  };
}

// 10. Coordinator: Flag an application
export async function flagApplicationByCoordinator(params: {
  applicationId: string;
  flagNotes: string;
}) {
  await prisma.eventApplication.update({
    where: { id: params.applicationId },
    data: {
      status: "FLAGGED_BY_COORDINATOR",
      coordinatorFlagNotes: params.flagNotes,
    },
  });
  revalidatePath("/");
  return { success: true };
}
