import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth(async function proxy(req: NextRequest & { auth?: any }) {
  const pathname = req.nextUrl.pathname;
  const session = req.auth;
  const user = session?.user;

  // Static files and internal Next.js requests bypass proxy
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // If in DEMO_MODE during development, allow local dev navigation
  if (process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true") {
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/mentor") ||
    pathname.startsWith("/coordinator") ||
    pathname.startsWith("/lecturer");

  if (isProtected && !user) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Coarse role check redirect in proxy (deep DB checks happen in lib/auth.ts)
  if (user) {
    const role = (user as any).role;
    if (pathname.startsWith("/mentor") && role !== "MENTOR" && role !== "COORDINATOR") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    if (pathname.startsWith("/coordinator") && role !== "COORDINATOR") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    if (pathname.startsWith("/lecturer") && role !== "LECTURER" && role !== "COORDINATOR") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
