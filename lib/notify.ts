import { prisma } from "@/lib/prisma";
import { after } from "next/server";

export type NotificationType =
  | "APPLICATION_FILED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "APPLICATION_FLAGGED";

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Safely schedules background task using Next.js after() when in a request context,
 * falling back gracefully in non-request environments (e.g. unit tests).
 */
export function scheduleAfterResponse(task: () => Promise<void> | void) {
  try {
    after(task);
  } catch {
    // Graceful fallback for non-request contexts (CLI tests / seed)
    Promise.resolve()
      .then(task)
      .catch((err) => console.error("Background task error:", err));
  }
}

/**
 * Sends an email via Resend API without exposing sensitive details.
 * Any network or authentication error is caught and logged, never throwing to caller.
 */
async function sendEmailViaResend(toEmail: string, subject: string, bodyText: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // If not configured, log dispatch for development/testing
    console.log(`[Email Dispatch - Resend Not Configured] To: ${toEmail} | Subject: ${subject}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "CampusFlow Notifications <notifications@college.edu>",
        to: [toEmail],
        subject,
        text: bodyText,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend API error (${res.status}): ${errText}`);
    }
  } catch (err: any) {
    console.error("Failed to deliver notification email via Resend:", err.message);
  }
}

/**
 * Creates in-app Notification and schedules non-sensitive email delivery after response.
 * Strictly avoids sensitive details (no medical info, no filenames, no file URLs).
 */
export async function createNotification(params: SendNotificationParams): Promise<void> {
  const { userId, type, title, message, link } = params;

  // 1. Write in-app Notification to DB
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link: link || null,
      read: false,
    },
  });

  // 2. Fetch user to check email preference
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailNotificationsEnabled: true },
  });

  if (!targetUser || !targetUser.emailNotificationsEnabled || !targetUser.email) {
    return;
  }

  // 3. Schedule email delivery using Next.js after()
  const emailText = `${message}\n\nPlease sign in to CampusFlow to view details: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}${link || ""}\n\n(This is an automated institutional notification from CampusFlow.)`;

  scheduleAfterResponse(async () => {
    await sendEmailViaResend(targetUser.email, `[CampusFlow] ${title}`, emailText);
  });
}

/**
 * Trigger: When an application is filed, notify the student's assigned mentor.
 */
export async function notifyApplicationFiled(applicationId: string) {
  const app = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    include: {
      student: {
        include: { mentor: true },
      },
    },
  });

  if (!app?.student?.mentorId) return;

  await createNotification({
    userId: app.student.mentorId,
    type: "APPLICATION_FILED",
    title: "New Application for Review",
    message: "A mentee has submitted an extracurricular application requesting On-Duty attendance credit.",
    link: "/mentor",
  });
}

/**
 * Trigger: When an application is reviewed (approved or rejected), notify the applicant student.
 */
export async function notifyApplicationReviewed(applicationId: string, action: "APPROVE" | "REJECT") {
  const app = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
  });

  if (!app) return;

  const isApproved = action === "APPROVE";
  await createNotification({
    userId: app.studentId,
    type: isApproved ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
    title: isApproved ? "Application Approved" : "Application Decision Updated",
    message: isApproved
      ? "Your extracurricular application has been approved by your mentor."
      : "Your extracurricular application status has been updated by your mentor.",
    link: "/events",
  });
}

/**
 * Trigger: When an application is flagged by coordinator, notify student and mentor.
 */
export async function notifyApplicationFlagged(applicationId: string) {
  const app = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    include: {
      student: {
        include: { mentor: true },
      },
    },
  });

  if (!app) return;

  // 1. Notify Student
  await createNotification({
    userId: app.studentId,
    type: "APPLICATION_FLAGGED",
    title: "Application Flagged for Review",
    message: "Your extracurricular application has been flagged by an institutional coordinator for further review.",
    link: "/events",
  });

  // 2. Notify Mentor if assigned
  if (app.student?.mentorId) {
    await createNotification({
      userId: app.student.mentorId,
      type: "APPLICATION_FLAGGED",
      title: "Mentee Application Flagged",
      message: "An application filed by your mentee has been flagged by the institutional coordinator.",
      link: "/mentor",
    });
  }
}
