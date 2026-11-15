import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGitHubProjectCommits } from "@/lib/github-verifier";
import { requireRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const caller = await requireRole(["STUDENT"]);
    const body = await req.json();
    const {
      title,
      category,
      startDate,
      endDate,
      description,
      proofType,
      proofUrl,
      githubRepoUrl,
      githubUsername,
    } = body;

    if (!title || !category || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields (title, category, startDate, endDate)" },
        { status: 400 }
      );
    }

    // Server derives identity strictly from authenticated session
    const studentId = caller.id;

    let githubCommitCount: number | null = null;
    let githubSummary: string | null = null;

    // If GitHub project proof was submitted, run commit verification
    if (proofType === "GITHUB_REPO" && githubRepoUrl) {
      const ghResult = await verifyGitHubProjectCommits({
        repoUrl: githubRepoUrl,
        username: githubUsername,
        startDate,
        endDate,
      });

      githubCommitCount = ghResult.commitCount;
      githubSummary = ghResult.summaryText;
    }

    const application = await prisma.eventApplication.create({
      data: {
        studentId,
        title,
        category,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || null,
        proofType: proofType || null,
        proofUrl: proofUrl || null,
        githubRepoUrl: githubRepoUrl || null,
        githubUsername: githubUsername || null,
        githubCommitCount,
        githubSummary,
        status: "PENDING_APPROVAL",
        proofVerified: false,
      },
    });

    return NextResponse.json({
      success: true,
      application,
      message: "Event application filed successfully and forwarded to mentor for approval.",
    });
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
