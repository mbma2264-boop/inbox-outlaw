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
      <Suspense fallback={<div className="loadingSkeleton">Loading your protected inbox…</div>}>
        <DashboardClient />
      </Suspense>
    </DashboardShell>
  );
}
