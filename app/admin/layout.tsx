import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();

  // Validate session via Better Auth API headers
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: headerList,
    });
  } catch (err) {
    // Fallback to direct resilient session resolver
    session = await getServerSession();
  }

  // If no session found or fallback needed
  if (!session || !session.user) {
    session = await getServerSession();
  }

  // Strict route guarding: must exist, be active, and have ADMIN role (case-insensitive)
  if (
    !session ||
    !session.user ||
    !session.user.isActive ||
    String(session.user.role).toUpperCase() !== "ADMIN"
  ) {
    redirect("/login");
  }

  return <>{children}</>;
}
