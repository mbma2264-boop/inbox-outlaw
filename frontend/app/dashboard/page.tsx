import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardClient from "../../components/DashboardClient";
import { getSessionUser } from "../../lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="page">
      <div className="container">
        <div style={{ marginBottom: 16 }}>
          <Link href="/" className="button secondary">Back</Link>
        </div>

        <section className="hero">
          <h1>Dashboard</h1>
          <p>
            Connect Gmail, sync recent inbox messages, and store the classified results in a local
            SQLite record store for <strong>{user.email}</strong> alongside anything you classify manually.
          </p>
        </section>

        <Suspense fallback={<p className="subtle">Loading dashboard…</p>}>
          <DashboardClient />
        </Suspense>
      </div>
    </main>
  );
}
