import Link from "next/link";
import { DEMO_EMAIL, getSessionUser } from "../lib/auth";

export default async function HomePage() {
  const sessionUser = await getSessionUser();

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <h1>Inbox Guardian Demo</h1>
          <p>
            A demo-ready inbox triage app that spots scams, surfaces real opportunities, explains its reasoning, and keeps a visible audit trail.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <Link href={sessionUser ? "/dashboard" : "/login"} className="button">
              {sessionUser ? "Open dashboard" : "Sign in for demo"}
            </Link>
            <a href="http://localhost:8000/docs" className="button secondary">Backend docs</a>
          </div>
          <p className="subtle" style={{ marginTop: 14 }}>
            Demo account preset: {DEMO_EMAIL}
          </p>
        </section>

        <section className="grid">
          <div className="card">
            <h2>Rules first</h2>
            <p>Deterministic rules score scams, promotions, and opportunities before any LLM step.</p>
          </div>
          <div className="card">
            <h2>Explainability</h2>
            <p>Every result includes risk, confidence, reasons, matched rules, and an action recommendation.</p>
          </div>
          <div className="card">
            <h2>Demo flow built in</h2>
            <p>Sign in, load sample inbox data, then optionally connect Gmail to show real sync on top of the seeded records.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
