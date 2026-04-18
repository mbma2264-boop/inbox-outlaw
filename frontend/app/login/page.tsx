import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_EMAIL, getSessionUser } from "../../lib/auth";

export default async function LoginPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    redirect("/dashboard");
  }

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <h1>Inbox Guardian Demo Login</h1>
          <p>
            Use the preset demo account below to open the dashboard quickly. It is pre-configured for your demo flow: <strong>{DEMO_EMAIL}</strong>.
          </p>
        </section>

        <section className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
          <form action="/api/auth/login" method="post" style={{ display: "grid", gap: 16 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={DEMO_EMAIL}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                color: "white",
              }}
            />
            <input type="hidden" name="redirect_to" value="/dashboard" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="button" type="submit">Continue to dashboard</button>
              <Link href="/" className="button secondary">Back</Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
