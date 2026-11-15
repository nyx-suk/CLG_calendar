import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const isDemo = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";

    if (!isDemo) {
      // In production, only coordinators can enumerate all users
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

    return NextResponse.json({ users });
  } catch (error: any) {
    const status = error.status || 404;
    return NextResponse.json({ error: error.message }, { status });
  }
}
