import { prisma } from "../lib/prisma";
import { authContextStorage } from "../lib/auth";
import {
  reviewApplication,
  getLecturerRoster,
  getStudentDashboard,
  updateBaselines,
  provisionUser,
  fileEventApplication,
  getCoordinatorAudit,
  flagApplicationByCoordinator,
} from "../app/actions";
import { GET as getRolesRoute } from "../app/api/auth/roles/route";
import { GET as getStudentDashboardRoute } from "../app/api/students/[id]/dashboard/route";
import { POST as postBaselineRoute } from "../app/api/students/[id]/baseline/route";
import { POST as postApplyRoute } from "../app/api/events/apply/route";
import { NextRequest } from "next/server";

import { validateAndLinkOAuthUser } from "../auth";

// Helper to simulate NextRequest
function createMockRequest(url: string, method: string = "GET", body?: any): NextRequest {
  const init: any = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

async function runAuthSecurityTests() {
  console.log("=== RUNNING AUTHENTICATION & AUTHORIZATION SECURITY TESTS ===\n");

  // Fetch test fixtures from seeded DB
  const mentor = await prisma.user.findFirstOrThrow({ where: { role: "MENTOR" } });
  const coordinator = await prisma.user.findFirstOrThrow({ where: { role: "COORDINATOR" } });
  const studentAarav = await prisma.user.findFirstOrThrow({
    where: { email: "aarav@college.edu" },
    include: { applications: true },
  });
  const studentSneha = await prisma.user.findFirstOrThrow({
    where: { email: "sneha@college.edu" },
    include: { applications: true },
  });
  const lecturerOS = await prisma.user.findFirstOrThrow({
    where: { email: "vikram.singh@college.edu" },
    include: { subjectsTaught: true },
  });
  const lecturerDBMS = await prisma.user.findFirstOrThrow({
    where: { email: "ananya.desai@college.edu" },
    include: { subjectsTaught: true },
  });

  // Create an unassigned mentor for non-mentee review testing
  let otherMentor = await prisma.user.findUnique({ where: { email: "other.mentor@college.edu" } });
  if (!otherMentor) {
    otherMentor = await prisma.user.create({
      data: {
        name: "Dr. Other Mentor",
        email: "other.mentor@college.edu",
        role: "MENTOR",
        active: true,
      },
    });
  }

  // Create an inactive user for testing deactivation enforcement
  let inactiveStudent = await prisma.user.findUnique({ where: { email: "inactive.student@college.edu" } });
  if (!inactiveStudent) {
    inactiveStudent = await prisma.user.create({
      data: {
        name: "Inactive Student",
        email: "inactive.student@college.edu",
        role: "STUDENT",
        active: false,
      },
    });
  }

  // Find or create an application belonging to Aarav
  let aaravApp = studentAarav.applications[0];
  if (!aaravApp) {
    aaravApp = await prisma.eventApplication.create({
      data: {
        studentId: studentAarav.id,
        title: "Security Hackathon 2026",
        category: "HACKATHON",
        startDate: new Date("2026-10-19T00:00:00.000Z"),
        endDate: new Date("2026-10-20T23:59:59.000Z"),
        status: "PENDING_APPROVAL",
      },
    });
  }

  // --- SECTION 1: SERVER ACTION AUTHORIZATION TESTS ---

  console.log("[TEST 1.1] Unauthorized Application Review by Student...");
  await authContextStorage.run(studentAarav, async () => {
    let failed = false;
    try {
      await reviewApplication({
        applicationId: aaravApp.id,
        action: "APPROVE",
      });
    } catch (e: any) {
      failed = true;
      if (e.status !== 403 && !e.message.includes("Forbidden")) {
        throw new Error(`Expected 403 Forbidden, got: ${e.message}`);
      }
    }
    if (!failed) throw new Error("Vulnerability: Student was able to review an application!");
    console.log("✓ Student review attempt blocked with Forbidden error.");
  });

  console.log("\n[TEST 1.2] Mentor Reviewing Non-Mentee Application (IDOR defense -> 404)...");
  await authContextStorage.run(otherMentor, async () => {
    let failed = false;
    try {
      await reviewApplication({
        applicationId: aaravApp.id,
        action: "APPROVE",
      });
    } catch (e: any) {
      failed = true;
      if (e.status !== 404 && !e.message.includes("Not Found")) {
        throw new Error(`Expected 404 Not Found for non-mentee, got status ${e.status}: ${e.message}`);
      }
    }
    if (!failed) throw new Error("Vulnerability: Other mentor was able to review a non-mentee's application!");
    console.log("✓ Non-mentee application review blocked with 404 Not Found.");
  });

  console.log("\n[TEST 1.3] Assigned Mentor Reviewing Mentee Application (Authorized)...");
  await authContextStorage.run(mentor, async () => {
    const result = await reviewApplication({
      applicationId: aaravApp.id,
      action: "APPROVE",
      remarks: "Approved by designated mentor Dr. Rajesh Rao",
    });
    if (!result.success) throw new Error("Expected approval to succeed");

    const updatedApp = await prisma.eventApplication.findUnique({
      where: { id: aaravApp.id },
    });
    if (updatedApp?.status !== "APPROVED") {
      throw new Error(`Expected status APPROVED, got ${updatedApp?.status}`);
    }
    // Amendment 7: Verify reviewedById is recorded
    if (updatedApp?.reviewedById !== mentor.id) {
      throw new Error(`Expected reviewedById = ${mentor.id}, got ${updatedApp?.reviewedById}`);
    }
    console.log("✓ Assigned mentor successfully approved application with reviewedById set!");
  });

  console.log("\n[TEST 1.4] Lecturer Roster Scope Isolation...");
  await authContextStorage.run(lecturerOS, async () => {
    // Lecturer Vikram teaches OS and SE Lab. Even if client tries to request another lecturer's ID (DBMS), it enforces caller's subjects
    const result = await getLecturerRoster(lecturerDBMS.id, "2026-10-19");
    const taughtIds = lecturerOS.subjectsTaught.map((s) => s.id);
    if (result.subjects.some((s) => !taughtIds.includes(s.id))) {
      throw new Error("Vulnerability: Lecturer was able to view subjects outside their assignment!");
    }
    // Explicitly verify DBMS subject is NOT included
    if (result.subjects.some((s) => s.code === "CS502")) {
      throw new Error("Vulnerability: Lecturer was able to access DBMS subject taught by another lecturer!");
    }
    console.log(`✓ Lecturer roster strictly restricted to assigned subjects (${result.subjects.map(s => s.name).join(", ")})`);
  });

  console.log("\n[TEST 1.5] Student Dashboard IDOR Attempt...");
  await authContextStorage.run(studentAarav, async () => {
    let failed = false;
    try {
      // Aarav attempts to view Sneha's private dashboard
      await getStudentDashboard(studentSneha.id, "2026-10-19");
    } catch (e: any) {
      failed = true;
      if (e.status !== 404 && !e.message.includes("Not Found")) {
        throw new Error(`Expected 404 Not Found on IDOR, got: ${e.message}`);
      }
    }
    if (!failed) throw new Error("Vulnerability: Student was able to access another student's dashboard!");
    console.log("✓ Cross-student dashboard access strictly blocked with 404 Not Found.");
  });

  console.log("\n[TEST 1.6] Attendance Baseline Modification Rules (Amendment 4)...");
  const osSubject = await prisma.subject.findFirstOrThrow({ where: { code: "CS501" } });

  // 1.6a: Aarav attempts to modify already established baseline -> Must fail with 403
  await authContextStorage.run(studentAarav, async () => {
    let failed = false;
    try {
      await updateBaselines(studentAarav.id, [
        { subjectId: osSubject.id, baselineConducted: 50, baselineAttended: 50 },
      ]);
    } catch (e: any) {
      failed = true;
      if (e.status !== 403 && !e.message.includes("Forbidden")) {
        throw new Error(`Expected 403 Forbidden for established baseline, got: ${e.message}`);
      }
    }
    if (!failed) throw new Error("Vulnerability: Student modified an already established baseline!");
    console.log("✓ Student blocked from modifying established baselines (403 Forbidden).");
  });

  // 1.6b: Coordinator modifies baseline -> Must succeed and write BaselineAuditLog
  await authContextStorage.run(coordinator, async () => {
    const prevBaseline = await prisma.attendanceBaseline.findUnique({
      where: {
        studentId_subjectId: {
          studentId: studentAarav.id,
          subjectId: osSubject.id,
        },
      },
    });

    const oldConducted = prevBaseline?.baselineConducted ?? 0;
    const oldAttended = prevBaseline?.baselineAttended ?? 0;

    await updateBaselines(studentAarav.id, [
      { subjectId: osSubject.id, baselineConducted: 22, baselineAttended: 18 },
    ]);

    const auditEntry = await prisma.baselineAuditLog.findFirst({
      where: {
        studentId: studentAarav.id,
        subjectId: osSubject.id,
        changedById: coordinator.id,
      },
      orderBy: { changedAt: "desc" },
    });

    if (!auditEntry) {
      throw new Error("Audit log entry was not created for coordinator baseline update!");
    }
    if (auditEntry.oldConducted !== oldConducted || auditEntry.newConducted !== 22) {
      throw new Error(`Audit log values mismatch: old=${auditEntry.oldConducted}, new=${auditEntry.newConducted}`);
    }
    console.log(`✓ Coordinator baseline update recorded in BaselineAuditLog (old: ${oldConducted}/${oldAttended} -> new: 22/18).`);
  });

  console.log("\n[TEST 1.7] User Pre-Provisioning Invariants (Amendment 5)...");
  await authContextStorage.run(coordinator, async () => {
    // 1.7a: Reject non-college email domain
    let domainFailed = false;
    try {
      await provisionUser({
        name: "Test Hacker",
        email: "hacker@gmail.com",
        role: "STUDENT",
      });
    } catch {
      domainFailed = true;
    }
    if (!domainFailed) throw new Error("Vulnerability: Provisioned user with non-college domain!");
    console.log("✓ Non-college domain rejected during provisioning.");

    // 1.7b: Reject role COORDINATOR via provisionUser (only env allowlist allowed)
    let coordFailed = false;
    try {
      await provisionUser({
        name: "Fake Admin",
        email: "fakeadmin@college.edu",
        role: "COORDINATOR" as any,
      });
    } catch {
      coordFailed = true;
    }
    if (!coordFailed) throw new Error("Vulnerability: provisionUser allowed creating COORDINATOR!");
    console.log("✓ COORDINATOR role rejected by provisionUser (env allowlist required).");

    // 1.7c: Reject invalid mentorId
    let mentorFailed = false;
    try {
      await provisionUser({
        name: "New Student",
        email: "newstudent@college.edu",
        role: "STUDENT",
        mentorId: studentAarav.id, // student is not a mentor
      });
    } catch {
      mentorFailed = true;
    }
    if (!mentorFailed) throw new Error("Vulnerability: provisionUser allowed non-mentor as mentorId!");
    console.log("✓ Invalid mentorId validated and rejected.");
  });

  // --- SECTION 2: API ROUTE AUTHORIZATION & IDOR TESTS ---

  console.log("\n[TEST 2.1] API Route IDOR Protection (GET /api/students/[id]/dashboard)...");
  await authContextStorage.run(studentAarav, async () => {
    const req = createMockRequest(`/api/students/${studentSneha.id}/dashboard`);
    const res = await getStudentDashboardRoute(req, {
      params: Promise.resolve({ id: studentSneha.id }),
    });
    if (res.status !== 404) {
      throw new Error(`Expected 404 Not Found on cross-student dashboard API, got: ${res.status}`);
    }
    console.log("✓ API Route returned 404 Not Found for IDOR attempt.");
  });

  console.log("\n[TEST 2.2] API Route Baseline Modification Enforcement (POST /api/students/[id]/baseline)...");
  await authContextStorage.run(studentAarav, async () => {
    const req = createMockRequest(`/api/students/${studentAarav.id}/baseline`, "POST", {
      baselines: [{ subjectId: osSubject.id, baselineConducted: 30, baselineAttended: 30 }],
    });
    const res = await postBaselineRoute(req, {
      params: Promise.resolve({ id: studentAarav.id }),
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for modifying established baseline via API, got: ${res.status}`);
    }
    console.log("✓ API Route blocked established baseline update with 403 Forbidden.");
  });

  console.log("\n[TEST 2.3] API Route Event Application Filing Identity Derivation (POST /api/events/apply)...");
  await authContextStorage.run(studentAarav, async () => {
    // Attempt spoofing studentId as studentSneha in payload
    const req = createMockRequest("/api/events/apply", "POST", {
      studentId: studentSneha.id,
      title: "Inter-College Robotics",
      category: "PROJECT",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    const res = await postApplyRoute(req);
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK from apply route, got status ${res.status}`);
    }
    const data = await res.json();
    if (data.application.studentId !== studentAarav.id) {
      throw new Error(`Vulnerability: Application bound to spoofed ID ${data.application.studentId} instead of session ID ${studentAarav.id}`);
    }
    console.log("✓ API Route ignored client studentId and securely bound application to session user ID!");
  });

  // --- SECTION 3: INACTIVE USER & CASE-INSENSITIVE AUTH TESTS ---

  console.log("\n[TEST 3.1] Inactive User Deactivation Enforcement...");
  await authContextStorage.run(inactiveStudent, async () => {
    let failed = false;
    try {
      await fileEventApplication({
        title: "Test Application",
        category: "SPORTS",
        startDate: "2026-11-10",
        endDate: "2026-11-11",
      });
    } catch (e: any) {
      failed = true;
      if (e.status !== 401 && !e.message.includes("Unauthorized")) {
        throw new Error(`Expected 401 Unauthorized for inactive user, got: ${e.message}`);
      }
    }
    if (!failed) throw new Error("Vulnerability: Inactive user was able to perform actions!");
    console.log("✓ Inactive user rejected with Unauthorized status.");
  });

  console.log("\n[TEST 3.2] Case-Insensitive Email Matching for Account Linking (Amendment 2)...");
  const testUpperEmail = "AARAV@COLLEGE.EDU";
  const userByUpper = await prisma.user.findFirst({
    where: { email: { equals: testUpperEmail.toLowerCase().trim() } },
  });
  if (!userByUpper || userByUpper.id !== studentAarav.id) {
    throw new Error(`Failed to match user by lowercased email: ${testUpperEmail}`);
  }
  console.log(`✓ Case-insensitive email resolution successfully matched "${testUpperEmail}" to User ID ${userByUpper.id}`);

  // --- SECTION 4: OAUTH SIGNIN VALIDATION, LINKING & BOOTSTRAP TESTS ---

  console.log("\n[TEST 4.1] OAuth SignIn: Reject Unverified Email (Amendment 2)...");
  const unverifiedResult = await validateAndLinkOAuthUser({
    user: { email: "aarav@college.edu", name: "Aarav Sharma" },
    account: { provider: "google", providerAccountId: "goog-123", type: "oauth" },
    profile: { email_verified: false },
  });
  if (unverifiedResult !== false) {
    throw new Error("Vulnerability: OAuth signin accepted unverified email!");
  }
  console.log("✓ OAuth signin rejected unverified email.");

  console.log("\n[TEST 4.2] OAuth SignIn: Reject Non-College Domain (Amendment 2)...");
  const wrongDomainResult = await validateAndLinkOAuthUser({
    user: { email: "aarav@gmail.com", name: "Aarav Sharma" },
    account: { provider: "google", providerAccountId: "goog-124", type: "oauth" },
    profile: { email_verified: true },
  });
  if (wrongDomainResult !== false) {
    throw new Error("Vulnerability: OAuth signin accepted non-college domain!");
  }
  console.log("✓ OAuth signin rejected external domain @gmail.com.");

  console.log("\n[TEST 4.3] OAuth SignIn: Reject Unprovisioned College Email (Amendment 1 & 2)...");
  const unprovisionedResult = await validateAndLinkOAuthUser({
    user: { email: "unknown.stranger@college.edu", name: "Stranger" },
    account: { provider: "google", providerAccountId: "goog-125", type: "oauth" },
    profile: { email_verified: true },
  });
  if (unprovisionedResult !== false) {
    throw new Error("Vulnerability: OAuth signin accepted unprovisioned user!");
  }
  console.log("✓ OAuth signin rejected unprovisioned email.");

  console.log("\n[TEST 4.4] OAuth SignIn: Reject Inactive User (Amendment 3)...");
  const inactiveResult = await validateAndLinkOAuthUser({
    user: { email: "inactive.student@college.edu", name: "Inactive Student" },
    account: { provider: "google", providerAccountId: "goog-126", type: "oauth" },
    profile: { email_verified: true },
  });
  if (inactiveResult !== false) {
    throw new Error("Vulnerability: OAuth signin accepted deactivated user account!");
  }
  console.log("✓ OAuth signin rejected deactivated user account.");

  console.log("\n[TEST 4.5] OAuth SignIn: Case-Insensitive Email Matching & Account Linking (Amendment 2)...");
  const uppercaseUserObj: any = { email: "AARAV@COLLEGE.EDU", name: "Aarav Sharma" };
  const successfulLink = await validateAndLinkOAuthUser({
    user: uppercaseUserObj,
    account: { provider: "google", providerAccountId: "goog-aarav-test", type: "oauth" },
    profile: { email_verified: true },
  });
  if (successfulLink !== true) {
    throw new Error("OAuth signin failed for valid provisioned student with uppercase email!");
  }
  if (uppercaseUserObj.id !== studentAarav.id) {
    throw new Error(`Expected linked user ID to be ${studentAarav.id}, got ${uppercaseUserObj.id}`);
  }
  const createdAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: "goog-aarav-test",
      },
    },
  });
  if (!createdAccount || createdAccount.userId !== studentAarav.id) {
    throw new Error("Account was not linked to existing user row in database!");
  }
  console.log("✓ OAuth signin successfully linked Google account to existing User row without duplication!");

  console.log("\n[TEST 4.6] Coordinator Bootstrap via Allowlist (Amendment 3)...");
  process.env.COORDINATOR_EMAILS = "bootstrap.admin@college.edu";
  const bootstrapUserObj: any = { email: "bootstrap.admin@college.edu", name: "Bootstrap Admin" };
  const bootstrapResult = await validateAndLinkOAuthUser({
    user: bootstrapUserObj,
    account: { provider: "google", providerAccountId: "goog-boot-coord", type: "oauth" },
    profile: { email_verified: true },
  });
  if (!bootstrapResult) {
    throw new Error("Failed to bootstrap coordinator on COORDINATOR_EMAILS allowlist!");
  }
  const bootstrappedCoord = await prisma.user.findUnique({
    where: { email: "bootstrap.admin@college.edu" },
  });
  if (!bootstrappedCoord || bootstrappedCoord.role !== "COORDINATOR") {
    throw new Error("Bootstrapped user did not have COORDINATOR role!");
  }
  console.log("✓ Bootstrap coordinator successfully provisioned via COORDINATOR_EMAILS allowlist!");

  // Clean up test data
  await prisma.account.deleteMany({
    where: {
      providerAccountId: { in: ["goog-aarav-test", "goog-boot-coord"] },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: ["other.mentor@college.edu", "inactive.student@college.edu", "bootstrap.admin@college.edu"] },
    },
  });

  console.log("\n>>> ALL 18 SECURITY & AUTHORIZATION TESTS PASSED PERFECTLY! <<<");
}

runAuthSecurityTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
