import { requireAuth } from "@/lib/session";
import { getClientDetailsAndHistory } from "@/lib/actions/caregiver-actions";
import { Navbar } from "@/components/Navbar";
import { ClientDetailView } from "@/components/client/ClientDetailView";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Patient History & Clinical Records | Glamour Homecare",
  description: "Comprehensive patient clinical profile, visit log history, and scheduled appointments.",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const { id } = await params;
  if (!id) {
    notFound();
  }

  const data = await getClientDetailsAndHistory(id);

  if (!data.success) {
    const isForbidden = data.error?.includes("Access Denied");
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <Navbar user={session.user} />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">
            {isForbidden ? "Restricted Patient Record" : "Patient Record Not Found"}
          </h1>
          <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
            {data.error || "The requested client record could not be located."}
          </p>
          <div className="mt-6">
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/app"}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to {session.user.role === "ADMIN" ? "Admin Portal" : "Caregiver Portal"}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Navbar user={session.user} />
      <ClientDetailView
        client={data.client}
        notes={data.notes || []}
        appointments={data.appointments || []}
        currentUser={session.user}
      />
    </div>
  );
}
