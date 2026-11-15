import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export async function validateAndLinkOAuthUser({
  user,
  account,
  profile,
}: {
  user: any;
  account?: any;
  profile?: any;
}): Promise<boolean> {
  const rawEmail = user.email || profile?.email;
  if (!rawEmail) {
    console.error("Sign in rejected: No email found on profile.");
    return false;
  }

  const email = rawEmail.toLowerCase().trim();

  // 1. Require email_verified from Google profile
  const isVerified =
    profile?.email_verified === true ||
    profile?.email_verified === "true";

  if (!isVerified) {
    console.error(`Sign in rejected: Email ${email} is not verified by OAuth provider.`);
    return false;
  }

  // 2. Server-side college email domain check (never rely solely on hd claim)
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "college.edu").toLowerCase().trim();
  const parts = email.split("@");
  const emailDomain = parts.length > 1 ? parts[1] : "";

  if (emailDomain !== allowedDomain) {
    console.error(`Sign in rejected: Email domain "${emailDomain}" does not match allowed domain "${allowedDomain}".`);
    return false;
  }

  // 3. Coordinator bootstrap allowlist check
  const coordinatorEmails = (process.env.COORDINATOR_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAllowedCoordinator = coordinatorEmails.includes(email);

  // 4. Find existing User in DB (case-insensitive check)
  let existingUser = await prisma.user.findFirst({
    where: { email: { equals: email } },
  });

  // If user does not exist in DB, bootstrap coordinator if on allowlist
  if (!existingUser && isAllowedCoordinator) {
    existingUser = await prisma.user.create({
      data: {
        name: user.name || "Institutional Coordinator",
        email: email,
        role: "COORDINATOR",
        active: true,
      },
    });
  }

  // Reject unprovisioned emails
  if (!existingUser) {
    console.error(`Sign in rejected: Unprovisioned email ${email}. A coordinator must provision the account first.`);
    return false;
  }

  // Enforce active status
  if (!existingUser.active) {
    console.error(`Sign in rejected: Account for ${email} is deactivated.`);
    return false;
  }

  // 5. Explicitly link Account to the pre-provisioned User row to prevent OAuthAccountNotLinked
  if (account) {
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
    });

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: (account.session_state as string) || null,
        },
      });
    }
  }

  // Bind identity to the existing DB user
  user.id = existingUser.id;
  (user as any).role = existingUser.role;
  (user as any).active = existingUser.active;

  return true;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    signIn: validateAndLinkOAuthUser,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.active = (user as any).active;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) || session.user.id;
        (session.user as any).role = token.role;
        (session.user as any).active = token.active;
      }
      return session;
    },
  },
});
