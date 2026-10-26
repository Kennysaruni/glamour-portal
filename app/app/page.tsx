import { requireAuth } from "@/lib/session";
import { getCaregiverDashboardData } from "@/lib/actions/caregiver-actions";
import { Navbar } from "@/components/Navbar";
import { CaregiverDashboardClient } from "@/components/caregiver/CaregiverDashboardClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Caregiver Field Portal | Glamour Homecare",
  description:
    "Mobile care visit documentation, vital signs logging, and patient care for Glamour Homecare caregivers.",
};

export const dynamic = "force-dynamic";

export default async function CaregiverPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const dashboardData = await getCaregiverDashboardData();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={session.user} />
      <CaregiverDashboardClient initialData={dashboardData} />
    </div>
  );
}
