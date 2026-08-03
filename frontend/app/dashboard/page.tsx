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
      <section className="dashboardWelcome">
        <div>
          <p className="eyebrow">INBOX PROTECTION OVERVIEW</p>
          <h1>Welcome back, Michelle.</h1>
          <p>Your Gmail connection is active. Review threats, opportunities, and recent AI decisions below.</p>
        </div>
        <div className="protectionLive"><span /> Protection live</div>
      </section>

      <Suspense fallback={<div className="loadingSkeleton">Loading your protected inbox…</div>}>
        <DashboardClient />
      </Suspense>
    </DashboardShell>
  );
}
