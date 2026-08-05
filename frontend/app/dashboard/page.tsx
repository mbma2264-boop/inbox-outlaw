import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardClient from "../../components/DashboardClient";
import DashboardShell from "../../components/DashboardShell";
import { getSessionUser } from "../../lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email}>
      <div style={{
        background: "linear-gradient(90deg, #ff2d8f 0%, #7c3aed 45%, #2563eb 100%)",
        color: "white",
        padding: "14px 18px",
        borderRadius: 14,
        fontWeight: 900,
        letterSpacing: ".08em",
        textAlign: "center",
        boxShadow: "0 0 34px rgba(124,58,237,.45)",
        border: "1px solid rgba(255,255,255,.28)",
        marginBottom: 20,
      }}>
        COLOR REDESIGN LIVE — INBOX OUTLAW COMMAND CENTER
      </div>
      <Suspense fallback={<div className="loadingSkeleton">Loading your protected inbox…</div>}>
        <DashboardClient />
      </Suspense>
    </DashboardShell>
  );
}
