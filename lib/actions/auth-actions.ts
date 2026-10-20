"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getServerSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  try {
    const { email, password } = formData;
    if (!email || !password) {
      return { success: false, error: "Email and password are required." };
    }

    const res = await auth.api.signInEmail({
      body: {
        email: email.trim().toLowerCase(),
        password,
      },
      headers: await headers(),
    });

    if (!res || !res.user) {
      return { success: false, error: "Invalid credentials." };
    }

    const role = (res.user as { role?: string }).role || "EMPLOYEE";
    return {
      success: true,
      role,
      redirectTo: role === "ADMIN" ? "/admin" : "/app",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sign in. Please verify your email and password.";
    return { success: false, error: errorMsg };
  }
}

export async function logoutAction() {
  try {
    const headerList = await headers();
    await auth.api.signOut({
      headers: headerList,
    });
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
