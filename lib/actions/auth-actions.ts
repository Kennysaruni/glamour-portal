"use server";

import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { getServerSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { checkLoginRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";

export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  try {
    const { email, password } = formData;
    if (!email || !password) {
      return { success: false, error: "Email and password are required." };
    }

    // IP-based rate limiting (10 attempts per 15 minutes)
    const headersList = await headers();
    const clientIp = getClientIpFromHeaders(headersList);
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.success) {
      const waitMins = Math.ceil(rateCheck.resetInSeconds / 60);
      return {
        success: false,
        error: `Too many login attempts from this location. Please wait ${waitMins} minute${waitMins === 1 ? "" : "s"} before trying again.`,
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify user account status upfront: block suspended / deactivated accounts
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, isActive: true },
    });

    if (existingUser && !existingUser.isActive) {
      return {
        success: false,
        error: "This account has been suspended or deactivated. Please contact your clinical administrator.",
      };
    }

    // Call Better Auth with asResponse: true so we can extract Set-Cookie
    const res = await auth.api.signInEmail({
      body: {
        email: cleanEmail,
        password,
      },
      asResponse: true,
    });

    if (!res.ok) {
      return { success: false, error: "Invalid email or password." };
    }

    const data = await res.json();
    if (!data || !data.user) {
      return { success: false, error: "Unable to find user account." };
    }

    if ((data.user as { isActive?: boolean }).isActive === false) {
      if (data.token) {
        await prisma.session.deleteMany({
          where: { token: data.token },
        });
      }
      return {
        success: false,
        error: "This account has been suspended or deactivated. Please contact your clinical administrator.",
      };
    }

    const cookieStore = await cookies();
    const isHttps = Boolean(process.env.BETTER_AUTH_URL?.startsWith("https://"));

    // Extract cookie from Better Auth response or fall back to data.token
    const setCookieHeader = res.headers.get("set-cookie");
    let tokenValue = data.token; // fallback to raw token from body

    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(
        /(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/
      );
      if (tokenMatch && tokenMatch[1]) {
        tokenValue = decodeURIComponent(tokenMatch[1]);
      }
    }

    if (tokenValue) {
      cookieStore.set("better-auth.session_token", tokenValue, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: isHttps,
      });

      if (isHttps) {
        cookieStore.set("__Secure-better-auth.session_token", tokenValue, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          secure: true,
        });
      }
    }

    const role = (data.user as { role?: string }).role || "EMPLOYEE";
    return {
      success: true,
      role,
      redirectTo: role === "ADMIN" ? "/admin" : "/app",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.";
    return { success: false, error: errorMsg };
  }
}

export async function logoutAction() {
  try {
    const session = await getServerSession();
    if (session?.session?.id) {
      await prisma.session.delete({ where: { id: session.session.id } }).catch(() => {});
    }

    const cookieStore = await cookies();
    cookieStore.delete("better-auth.session_token");
    cookieStore.delete("__Secure-better-auth.session_token");
  } catch (error) {
    console.error("Logout error:", error);
  }
  revalidatePath("/");
  return { success: true };
}

export async function getCurrentUserRole() {
  const session = await getServerSession();
  if (!session) return null;
  return session.user.role;
}
