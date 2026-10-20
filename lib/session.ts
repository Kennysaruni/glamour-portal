import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/types";

export interface CurrentUserSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role | string;
    phone?: string | null;
    isActive: boolean;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
}

export async function getServerSession(): Promise<CurrentUserSession | null> {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({
      headers: headerList,
    });
    if (session && session.user) {
      return session as unknown as CurrentUserSession;
    }
  } catch (error) {
    // Fallback to direct cookie validation below
  }

  // Resilient fallback: inspect session token directly from cookies
  try {
    const cookieStore = await cookies();
    const cookieValue =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("__Secure-better-auth.session_token")?.value;
    if (!cookieValue) return null;

    // Cookie token may be signed (token.signature) or raw token
    const rawToken = cookieValue.split(".")[0];
    if (!rawToken) return null;

    let dbSession = await prisma.session.findUnique({
      where: { token: rawToken },
      include: { user: true },
    });

    if (!dbSession && cookieValue !== rawToken) {
      dbSession = await prisma.session.findUnique({
        where: { token: cookieValue },
        include: { user: true },
      });
    }

    if (!dbSession || !dbSession.user || !dbSession.user.isActive) {
      return null;
    }

    if (new Date(dbSession.expiresAt) < new Date()) {
      return null;
    }

    return {
      user: {
        id: dbSession.user.id,
        email: dbSession.user.email,
        name: dbSession.user.name,
        role: dbSession.user.role,
        phone: dbSession.user.phone,
        isActive: dbSession.user.isActive,
      },
      session: {
        id: dbSession.id,
        userId: dbSession.userId,
        token: dbSession.token,
        expiresAt: dbSession.expiresAt,
      },
    };
  } catch (error) {
    console.error("Direct session lookup error:", error);
    return null;
  }
}

export async function requireAuth(): Promise<CurrentUserSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin(): Promise<CurrentUserSession> {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN: Admin role required");
  }
  return session;
}

export async function requireEmployee(): Promise<CurrentUserSession> {
  const session = await requireAuth();
  return session;
}
