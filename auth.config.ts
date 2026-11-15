import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Startup invariant: Throw at startup if DEMO_MODE=true when NODE_ENV=production
if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true") {
  throw new Error("FATAL CONFIGURATION ERROR: DEMO_MODE cannot be enabled in production environment.");
}

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isProtected =
        pathname === "/" ||
        pathname.startsWith("/attendance") ||
        pathname.startsWith("/calendar") ||
        pathname.startsWith("/events") ||
        pathname.startsWith("/mentor") ||
        pathname.startsWith("/coordinator") ||
        pathname.startsWith("/lecturer");

      if (isProtected && !isLoggedIn) {
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.active = (user as any).active;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) || session.user.id;
        (session.user as any).role = token.role;
        (session.user as any).active = token.active;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
