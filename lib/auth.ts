import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import type { User, Subject } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

export const authContextStorage = new AsyncLocalStorage<AuthenticatedUser | null>();

// Throw at startup if DEMO_MODE=true when NODE_ENV=production
if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true") {
  throw new Error("FATAL CONFIGURATION ERROR: DEMO_MODE cannot be enabled in production environment.");
}

export type AuthenticatedUser = User & {
  mentor?: User | null;
  subjectsTaught?: Subject[];
};

/**
 * Retrieve the current session user.
 * Re-reads role and active status from the database on every request.
 */
export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  // Check if an explicit context was set (e.g. in test suites or worker contexts)
  const contextUser = authContextStorage.getStore();
  if (contextUser !== undefined) {
    if (contextUser && !contextUser.active) return null;
    return contextUser;
  }
  // 1. Support local demo persona switcher ONLY in non-production when DEMO_MODE=true
  if (process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true") {
    try {
      const headerList = await headers();
      const cookieStore = await cookies();

      const demoHeaderId = headerList.get("x-demo-user-id");
      const demoCookieId = cookieStore.get("campusflow_user_id")?.value;
      const demoTargetId = demoHeaderId || demoCookieId;

      if (demoTargetId) {
        const demoUser = await prisma.user.findUnique({
          where: { id: demoTargetId },
          include: {
            mentor: true,
            subjectsTaught: true,
          },
        });
        if (demoUser && demoUser.active) {
          return demoUser;
        }
      }
    } catch {
      // In non-request environments (e.g. background tasks or seed), continue to normal auth
    }
  }

  // 2. Production or standard OAuth session
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  const sessionUserId = session?.user?.id;
  const sessionUserEmail = session?.user?.email?.toLowerCase().trim();

  if (!sessionUserId && !sessionUserEmail) {
    return null;
  }

  // Re-read role and active status from DB on EVERY request
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        ...(sessionUserId ? [{ id: sessionUserId }] : []),
        ...(sessionUserEmail ? [{ email: sessionUserEmail }] : []),
      ],
    },
    include: {
      mentor: true,
      subjectsTaught: true,
    },
  });

  if (!dbUser || !dbUser.active) {
    return null;
  }

  return dbUser;
}

/**
 * Asserts the caller has an active, authenticated session.
 * Throws 401 if unauthenticated.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getSessionUser();
  if (!user) {
    const error: any = new Error("Unauthorized: Authentication required");
    error.status = 401;
    throw error;
  }
  return user;
}

/**
 * Asserts the caller has one of the allowed roles.
 * Throws 403 if role is forbidden.
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    const error: any = new Error("Forbidden: Insufficient privileges");
    error.status = 403;
    throw error;
  }
  return user;
}

/**
 * Asserts caller is the assigned mentor of the given student (or coordinator).
 * Returns 404 (not 403) when caller has no relationship to the student to prevent IDOR leaks.
 */
export async function requireMentorOf(studentId: string): Promise<User> {
  const caller = await requireUser();

  if (caller.role === "COORDINATOR") {
    const student = await prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
    });
    if (!student) {
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }
    return student;
  }

  if (caller.role === "MENTOR") {
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: "STUDENT",
        mentorId: caller.id,
      },
    });
    if (!student) {
      // Amendment 8: Return 404 when caller has no relationship to resource
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }
    return student;
  }

  const error: any = new Error("Not Found: Student not found");
  error.status = 404;
  throw error;
}

/**
 * Asserts ownership over student data:
 * - Student can only access their own data.
 * - Mentor can access their assigned mentees' data.
 * - Coordinator can access any student's data.
 * Returns 404 if caller has no relationship.
 */
export async function requireOwnsStudentData(studentId: string): Promise<User> {
  const caller = await requireUser();

  if (caller.role === "STUDENT") {
    if (caller.id !== studentId) {
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }
    return caller;
  }

  if (caller.role === "MENTOR") {
    return requireMentorOf(studentId);
  }

  if (caller.role === "COORDINATOR") {
    const student = await prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
    });
    if (!student) {
      const error: any = new Error("Not Found: Student not found");
      error.status = 404;
      throw error;
    }
    return student;
  }

  const error: any = new Error("Not Found: Student not found");
  error.status = 404;
  throw error;
}

/**
 * Asserts ownership over an event application:
 * - Student owner can view.
 * - Assigned mentor can view/review.
 * - Coordinator can view/flag.
 * Returns 404 if caller has no relationship.
 */
export async function requireOwnsApplication(applicationId: string) {
  const caller = await requireUser();

  const application = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    include: {
      student: true,
    },
  });

  if (!application) {
    const error: any = new Error("Not Found: Application not found");
    error.status = 404;
    throw error;
  }

  if (caller.role === "STUDENT") {
    if (application.studentId !== caller.id) {
      const error: any = new Error("Not Found: Application not found");
      error.status = 404;
      throw error;
    }
    return application;
  }

  if (caller.role === "MENTOR") {
    if (application.student.mentorId !== caller.id) {
      const error: any = new Error("Not Found: Application not found");
      error.status = 404;
      throw error;
    }
    return application;
  }

  if (caller.role === "COORDINATOR") {
    return application;
  }

  const error: any = new Error("Not Found: Application not found");
  error.status = 404;
  throw error;
}
