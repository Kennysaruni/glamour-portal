import { requireAdmin } from "@/lib/session";
import {
  getStaffList,
  getClientsList,
  getAppointmentsList,
  getGlobalActivityFeed,
  getAuditLogs,
} from "@/lib/actions/admin-actions";
import { Navbar } from "@/components/Navbar";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Dashboard | Glamour Homecare Portal",
  description:
    "Centralized clinical oversight, staff provisioning, client directory, and activity monitoring for Glamour Homecare, LLC.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [staff, clients, appointments, notes, auditLogs] = await Promise.all([
    getStaffList(),
    getClientsList(),
    getAppointmentsList(),
    getGlobalActivityFeed(),
    getAuditLogs(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Navbar user={session.user} />
      <AdminDashboardClient
        initialStaff={staff}
        initialClients={clients}
        initialAppointments={appointments}
        initialNotes={notes}
        initialAuditLogs={auditLogs}
        currentUser={session.user}
      />
    </div>
  );
}
