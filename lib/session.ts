import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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
    if (!session || !session.user) {
      return null;
    }
    return session as unknown as CurrentUserSession;
  } catch (error) {
    console.error("Error retrieving server session:", error);
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
