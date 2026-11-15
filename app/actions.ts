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
import {
  requireUser,
  requireRole,
  requireMentorOf,
} from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage";
import {
  notifyApplicationFiled,
  notifyApplicationReviewed,
  notifyApplicationFlagged,
} from "@/lib/notify";

function safeRevalidatePath(path: string = "/") {
  try {
    revalidatePath(path);
  } catch {
    // In non-request environments (e.g. unit test runner), ignore static generation store error
  }
}

// 1. Get users for role switching (restricted to dev demo mode or coordinator)
export async function getUsersAndRoles() {
  const isDemo = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";

  if (!isDemo) {
    // In production, only coordinators can list all institutional users
    await requireRole(["COORDINATOR"]);
  }

  const users = await prisma.user.findMany({
    where: { active: true },
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

// 2. Fetch student dashboard data (server-side authorization and ownership)
export async function getStudentDashboard(studentId?: string, dateStr: string = "2026-10-19") {
  const caller = await requireUser();
  let targetStudentId = caller.id;

  if (caller.role === "STUDENT") {
    // Students can only view their own dashboard
    if (studentId && studentId !== caller.id) {
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }
    targetStudentId = caller.id;
  } else if (caller.role === "MENTOR") {
    if (!studentId) {
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }
    await requireMentorOf(studentId);
    targetStudentId = studentId;
  } else if (caller.role === "COORDINATOR") {
    if (!studentId) {
      targetStudentId = caller.id;
    } else {
      const student = await prisma.user.findFirst({
        where: { id: studentId, role: "STUDENT" },
      });
      if (!student) {
        const error: any = new Error("Not Found: Student not found");
        error.status = 404;
        throw error;
      }
      targetStudentId = studentId;
    }
  } else {
    const error: any = new Error("Not Found: Student not found");
    error.status = 404;
    throw error;
  }

  const student = await prisma.user.findUnique({
    where: { id: targetStudentId },
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

  if (!student) {
    const error: any = new Error("Not Found: Student not found");
    error.status = 404;
    throw error;
  }

  const subjects = await prisma.subject.findMany({
    include: { lecturer: true },
    orderBy: { code: "asc" },
  });

  const attendanceRecords = await prisma.classAttendanceRecord.findMany({
    where: { studentId: targetStudentId },
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
    studentId: targetStudentId,
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

// 3. Update Mid-Semester Baseline Attendance (with strict onboarding & coordinator audit log)
export async function updateBaselines(
  studentId: string,
  baselines: { subjectId: string; baselineConducted: number; baselineAttended: number }[]
) {
  const caller = await requireUser();

  if (caller.role === "STUDENT") {
    // IDOR protection: Student can only modify their own baselines
    if (caller.id !== studentId) {
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }

    // Amendment 4: Students may set them ONLY if no baseline row exists for that subject (onboarding)
    for (const b of baselines) {
      const existing = await prisma.attendanceBaseline.findUnique({
        where: {
          studentId_subjectId: {
            studentId,
            subjectId: b.subjectId,
          },
        },
      });

      if (existing) {
        const error: any = new Error(
          "Forbidden: Attendance baselines have already been established for this subject. Only institutional coordinators can modify established baselines."
        );
        error.status = 403;
        throw error;
      }
    }
  } else if (caller.role === "COORDINATOR") {
    // Coordinators can modify any student's baseline
    const student = await prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
    });
    if (!student) {
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }
  } else {
    // Mentors and Lecturers cannot modify baselines
    const error: any = new Error("Forbidden: Mentors and lecturers are not permitted to modify attendance baselines.");
    error.status = 403;
    throw error;
  }

  // Non-negotiable Rule 4: AttendanceBaseline writes use upsert on studentId_subjectId
  for (const b of baselines) {
    const existing = await prisma.attendanceBaseline.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
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
          studentId,
          subjectId: b.subjectId,
        },
      },
      update: {
        baselineConducted: newConducted,
        baselineAttended: newAttended,
        asOfDate: new Date(),
      },
      create: {
        studentId,
        subjectId: b.subjectId,
        baselineConducted: newConducted,
        baselineAttended: newAttended,
      },
    });

    // Amendment 4: Write audit entry for every change
    await prisma.baselineAuditLog.create({
      data: {
        baselineId: baselineRecord.id,
        studentId,
        subjectId: b.subjectId,
        changedById: caller.id,
        oldConducted,
        oldAttended,
        newConducted,
        newAttended,
      },
    });
  }

  safeRevalidatePath("/");
  return { success: true };
}

// 4. File an Event Application (server-derived student identity)
export async function fileEventApplication(data: {
  studentId?: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  description?: string;
  proofType?: string;
  proofUrl?: string;
  proofFileKey?: string;
  githubRepoUrl?: string;
  githubUsername?: string;
}) {
  const caller = await requireRole(["STUDENT"]);
  // Derive studentId strictly from session; do not trust client parameter
  const studentId = caller.id;

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

  // Amendment 3: Atomic transaction verifying and attaching proofFileKey
  const application = await prisma.$transaction(async (tx) => {
    let attachedUpload: any = null;

    if (data.proofFileKey) {
      const upload = await tx.upload.findUnique({
        where: { key: data.proofFileKey },
      });

      if (!upload || upload.uploaderId !== caller.id || upload.status !== "UNATTACHED") {
        const error: any = new Error(
          "Invalid proof upload: File does not belong to you or has already been attached."
        );
        error.status = 400;
        throw error;
      }

      await tx.upload.update({
        where: { id: upload.id },
        data: { status: "ATTACHED" },
      });

      attachedUpload = upload;
    }

    return tx.eventApplication.create({
      data: {
        studentId,
        title: data.title,
        category: data.category,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        description: data.description || null,
        proofType: data.proofType || null,
        proofUrl: data.proofUrl || null,
        proofFileKey: attachedUpload?.key || null,
        proofMimeType: attachedUpload?.detectedMime || null,
        proofSizeBytes: attachedUpload?.size || null,
        proofOriginalName: attachedUpload?.sanitizedFileName || null,
        githubRepoUrl: data.githubRepoUrl || null,
        githubUsername: data.githubUsername || null,
        githubCommitCount,
        githubSummary,
        status: "PENDING_APPROVAL",
        proofVerified: false,
      },
    });
  });

  // Amendment 5: In-app notifications written after main transaction commits
  await notifyApplicationFiled(application.id);

  safeRevalidatePath("/");
  return { success: true, application };
}

// 5. Safe-to-Miss Simulator
export async function simulateEvent(params: {
  currentStats: AttendanceStats;
  missedClasses: number;
  isCoveredByOD: boolean;
}) {
  await requireUser();
  return simulateMissImpact(params.currentStats, params.missedClasses, params.isCoveredByOD);
}

// 6. Mentor: Fetch applications and mentee health
export async function getMentorDashboard(mentorId?: string) {
  const caller = await requireRole(["MENTOR", "COORDINATOR"]);
  // If caller is mentor, strictly use caller.id
  const targetMentorId = caller.role === "MENTOR" ? caller.id : (mentorId || caller.id);

  const mentor = await prisma.user.findUnique({
    where: { id: targetMentorId },
  });

  if (!mentor || mentor.role !== "MENTOR") {
    const error: any = new Error("Not Found: Mentor not found");
    error.status = 404;
    throw error;
  }

  const applications = await prisma.eventApplication.findMany({
    where: {
      student: { mentorId: targetMentorId },
    },
    include: {
      student: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const mentees = await prisma.user.findMany({
    where: { mentorId: targetMentorId, role: "STUDENT" },
    include: {
      baselines: { include: { subject: true } },
      applications: true,
    },
  });

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

// 7. Mentor / Coordinator: Review Application (Approve / Reject / Validate Proof & Credit OD)
export async function reviewApplication(params: {
  applicationId: string;
  action: "APPROVE" | "REJECT";
  remarks?: string;
  markProofVerified?: boolean;
}) {
  const { applicationId, action, remarks, markProofVerified } = params;
  const caller = await requireRole(["MENTOR", "COORDINATOR"]);

  const app = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    include: { student: true },
  });

  if (!app) {
    const error: any = new Error("Not Found: Application not found");
    error.status = 404;
    throw error;
  }

  // Amendment 8: Return 404 when caller has no relationship to resource
  if (caller.role === "MENTOR" && app.student.mentorId !== caller.id) {
    const error: any = new Error("Not Found: Application not found");
    error.status = 404;
    throw error;
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  // Amendment 7: Set reviewedById on EventApplication
  await prisma.eventApplication.update({
    where: { id: applicationId },
    data: {
      status: newStatus,
      mentorRemarks: remarks || (action === "APPROVE" ? "Approved by mentor." : "Rejected by mentor."),
      proofVerified: markProofVerified ?? (action === "APPROVE" && (!!app.proofUrl || !!app.githubRepoUrl)),
      reviewedById: caller.id,
    },
  });

  // If approved, create/credit ON_DUTY records for matching slots during event duration
  // Non-negotiable Rule 4: ClassAttendanceRecord writes use upsert on studentId_subjectId_date_slotStartTime
  if (action === "APPROVE") {
    const startDate = new Date(app.startDate);
    const endDate = new Date(app.endDate);

    const curDate = new Date(startDate);
    while (curDate <= endDate) {
      const dateStr = curDate.toISOString().split("T")[0];
      const jsDay = curDate.getUTCDay();
      const baseDayOfWeek = jsDay === 0 ? 7 : jsDay;

      const coeEvent = await prisma.cOEEvent.findFirst({ where: { date: dateStr } });
      let effectiveDay = baseDayOfWeek;
      if (coeEvent && coeEvent.type === "TIMETABLE_SWAP" && coeEvent.swapDayOfWeek) {
        effectiveDay = coeEvent.swapDayOfWeek;
      }

      if (effectiveDay !== 7 && (!coeEvent || coeEvent.type !== "HOLIDAY")) {
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

  // Trigger non-sensitive notification to applicant student
  await notifyApplicationReviewed(applicationId, action);

  safeRevalidatePath("/");
  return { success: true };
}

// 8. Lecturer: Transparency view to avoid prejudice (restricted strictly to subjects taught)
export async function getLecturerRoster(lecturerId?: string, dateStr: string = "2026-10-19") {
  const caller = await requireRole(["LECTURER", "COORDINATOR"]);
  // If caller is lecturer, strictly enforce caller.id
  const targetLecturerId = caller.role === "LECTURER" ? caller.id : (lecturerId || caller.id);

  const lecturer = await prisma.user.findUnique({
    where: { id: targetLecturerId },
    include: {
      subjectsTaught: true,
    },
  });

  if (!lecturer || lecturer.role !== "LECTURER") {
    const error: any = new Error("Not Found: Lecturer not found");
    error.status = 404;
    throw error;
  }

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

// 9. Coordinator: Institutional Audit Console
export async function getCoordinatorAudit() {
  const caller = await requireRole(["COORDINATOR"]);

  const applications = await prisma.eventApplication.findMany({
    include: {
      student: {
        include: { mentor: true },
      },
      reviewedBy: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return {
    coordinator: caller,
    applications,
  };
}

// 10. Coordinator: Flag an application
export async function flagApplicationByCoordinator(params: {
  applicationId: string;
  flagNotes: string;
}) {
  await requireRole(["COORDINATOR"]);

  const application = await prisma.eventApplication.findUnique({
    where: { id: params.applicationId },
  });

  if (!application) {
    const error: any = new Error("Not Found: Application not found");
    error.status = 404;
    throw error;
  }

  await prisma.eventApplication.update({
    where: { id: params.applicationId },
    data: {
      status: "FLAGGED_BY_COORDINATOR",
      coordinatorFlagNotes: params.flagNotes,
    },
  });

  // Trigger non-sensitive notifications to student and mentor
  await notifyApplicationFlagged(params.applicationId);

  safeRevalidatePath("/");
  return { success: true };
}

// 11. Coordinator: Pre-provision User (Amendment 5)
export async function provisionUser(data: {
  name: string;
  email: string;
  role: "STUDENT" | "MENTOR" | "LECTURER";
  department?: string;
  semester?: number;
  section?: string;
  rollNumber?: string;
  mentorId?: string;
  githubUsername?: string;
}) {
  await requireRole(["COORDINATOR"]);

  // Only STUDENT, MENTOR, LECTURER may be created via provisionUser
  if (!["STUDENT", "MENTOR", "LECTURER"].includes(data.role)) {
    const error: any = new Error("Forbidden: Only STUDENT, MENTOR, or LECTURER accounts may be provisioned.");
    error.status = 403;
    throw error;
  }

  const email = data.email.toLowerCase().trim();
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "college.edu").toLowerCase().trim();
  const emailDomain = email.split("@")[1];

  if (!emailDomain || emailDomain !== allowedDomain) {
    const error: any = new Error(`Validation Error: Email must belong to the college domain @${allowedDomain}`);
    error.status = 400;
    throw error;
  }

  // Validate email uniqueness
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email } },
  });

  if (existing) {
    const error: any = new Error(`Conflict: A user with email ${email} already exists.`);
    error.status = 409;
    throw error;
  }

  // Validate that mentorId refers to an existing user with role MENTOR
  if (data.mentorId) {
    const mentor = await prisma.user.findUnique({
      where: { id: data.mentorId },
    });
    if (!mentor || mentor.role !== "MENTOR") {
      const error: any = new Error("Validation Error: mentorId must refer to an existing user with role MENTOR.");
      error.status = 400;
      throw error;
    }
  }

  const newUser = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      role: data.role,
      active: true,
      department: data.department || null,
      semester: data.semester ? Number(data.semester) : null,
      section: data.section || null,
      rollNumber: data.rollNumber || null,
      githubUsername: data.githubUsername || null,
      mentorId: data.mentorId || null,
    },
  });

  safeRevalidatePath("/");
  return { success: true, user: newUser };
}

// 12. Get Signed Proof Download URL (strictly barring lecturers)
export async function getSignedProofUrl(applicationId: string) {
  const caller = await requireUser();

  const app = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    include: { student: true },
  });

  if (!app || !app.proofFileKey) {
    const error: any = new Error("Not Found: Proof document not found");
    error.status = 404;
    throw error;
  }

  // Access control:
  // - Applicant student: ALLOWED
  // - Assigned mentor: ALLOWED
  // - Coordinator: ALLOWED
  // - LECTURERS: STRICTLY BARRED (returns 404)
  const isApplicant = app.studentId === caller.id;
  const isAssignedMentor = caller.role === "MENTOR" && app.student.mentorId === caller.id;
  const isCoordinator = caller.role === "COORDINATOR";

  if (!isApplicant && !isAssignedMentor && !isCoordinator) {
    const error: any = new Error("Not Found: Proof document not found");
    error.status = 404;
    throw error;
  }

  const storage = getStorageProvider();
  const signedUrl = await storage.getSignedDownloadUrl(app.proofFileKey, 900); // 15 mins validity
  return { signedUrl };
}

// 13. Fetch Notifications for the active user
export async function getNotifications() {
  const caller = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: caller.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: caller.id, read: false },
  });

  return { notifications, unreadCount };
}

// 14. Mark Notification as Read (ownership verified)
export async function markNotificationAsRead(notificationId: string) {
  const caller = await requireUser();

  const notif = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notif || notif.userId !== caller.id) {
    const error: any = new Error("Not Found: Notification not found");
    error.status = 404;
    throw error;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return { success: true };
}

// 15. Toggle User Email Notification Setting
export async function toggleEmailNotifications(enabled: boolean) {
  const caller = await requireUser();

  await prisma.user.update({
    where: { id: caller.id },
    data: { emailNotificationsEnabled: enabled },
  });

  safeRevalidatePath("/");
  return { success: true, emailNotificationsEnabled: enabled };
}

