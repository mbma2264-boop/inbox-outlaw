import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_EMAIL, getSessionUser } from "../lib/auth";
import { getBackendDocsUrl } from "../lib/backend";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const code = firstParam(params.code);
  const state = firstParam(params.state);
  const error = firstParam(params.error);

  if ((code && state) || error) {
    const callbackParams = new URLSearchParams();
    if (code) callbackParams.set("code", code);
    if (state) callbackParams.set("state", state);
    if (error) callbackParams.set("error", error);
    redirect(`/api/gmail/oauth/callback?${callbackParams.toString()}`);
  }

  const sessionUser = await getSessionUser();
  const backendDocsUrl = getBackendDocsUrl();

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <h1>Inbox Outlaw Demo</h1>
          <p>
            A demo-ready inbox triage app that spots scams, surfaces real opportunities, explains its reasoning, and keeps a visible audit trail.
          </p>
          <p>
            Gmail access is optional. If you connect Gmail, Inbox Outlaw asks Google only for read-only access to recent inbox messages so it can classify them in your dashboard.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <Link href={sessionUser ? "/dashboard" : "/login"} className="button">
              {sessionUser ? "Open dashboard" : "Sign in for demo"}
            </Link>
            <a href={backendDocsUrl} className="button secondary">Backend docs</a>
            <Link href="/privacy" className="button secondary">Privacy</Link>
            <Link href="/terms" className="button secondary">Terms</Link>
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
            <h2>Read-only Gmail sync</h2>
            <p>Connect Gmail only when you want to import recent inbox messages. The app does not send, edit, delete, archive, or mark messages as read.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
