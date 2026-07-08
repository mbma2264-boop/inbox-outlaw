import Link from "next/link";

const effectiveDate = "July 8, 2026";

export default function TermsPage() {
  return (
    <main className="page">
      <div className="container">
        <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" className="button secondary">Home</Link>
          <Link href="/privacy" className="button secondary">Privacy</Link>
        </div>

        <section className="hero">
          <p className="subtle">Effective date: {effectiveDate}</p>
          <h1>Inbox Outlaw Terms of Service</h1>
          <p>
            These terms apply to your use of Inbox Outlaw, a demo inbox triage app for classifying email risk and surfacing recommended actions.
          </p>
        </section>

        <section className="panel" style={{ display: "grid", gap: 18 }}>
          <div>
            <h2>Demo use</h2>
            <p>
              Inbox Outlaw is provided as a demonstration and evaluation tool. Classifications, risk scores, and recommendations are informational only and should not be treated as legal, financial, security, or professional advice.
            </p>
          </div>

          <div>
            <h2>Gmail connection</h2>
            <p>
              Connecting Gmail is optional. If you connect Gmail, you authorize Inbox Outlaw to request read-only Gmail access so it can retrieve recent inbox messages, classify them, and display the results in your dashboard. Inbox Outlaw does not send, modify, delete, archive, or mark Gmail messages as read.
            </p>
          </div>

          <div>
            <h2>Your responsibilities</h2>
            <ul>
              <li>Use Inbox Outlaw only with accounts and data you are authorized to access.</li>
              <li>Do not use the app to violate law, privacy rights, security controls, or third-party terms.</li>
              <li>Review important messages yourself before taking action based on any classification.</li>
            </ul>
          </div>

          <div>
            <h2>Disconnecting access</h2>
            <p>
              You can disconnect Gmail from the dashboard at any time. You can also revoke the app's access from your Google Account security settings.
            </p>
          </div>

          <div>
            <h2>Availability</h2>
            <p>
              Inbox Outlaw may change, pause, or stop being available. Because this is a demo, data may be temporary and the app may not preserve every synced record across deployments or sessions.
            </p>
          </div>

          <div>
            <h2>Contact</h2>
            <p>
              Questions about these terms can be sent to <a href="mailto:mbma2264@gmail.com" style={{ textDecoration: "underline" }}>mbma2264@gmail.com</a>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
