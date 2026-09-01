import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const sessionUser = await getSessionUser();
  if (sessionUser) redirect("/dashboard");
  const params = searchParams ? await searchParams : undefined;
  const error = params?.error;

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <h1>Sign in to Inbox Outlaw</h1>
          <p>Use your Google account so Inbox Outlaw can verify that the account belongs to you.</p>
          <p className="subtle">Signing in does not grant Gmail access. Gmail remains a separate read-only connection you choose from the dashboard.</p>
        </section>

        <section className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
          {error ? <div className="errorBanner" style={{ marginBottom: 16 }}>{error}</div> : null}
          <div style={{ display: "grid", gap: 16 }}>
            <a className="button" href="/api/auth/google/start?return_to=/dashboard">Continue with Google</a>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/" className="button secondary">Back</Link>
              <Link href="/privacy" className="button secondary">Privacy</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
