import Link from "next/link";

const effectiveDate = "July 8, 2026";

export default function PrivacyPage() {
  return (
    <main className="page">
      <div className="container">
        <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" className="button secondary">Home</Link>
          <Link href="/terms" className="button secondary">Terms</Link>
        </div>

        <section className="hero">
          <p className="subtle">Effective date: {effectiveDate}</p>
          <h1>Inbox Outlaw Privacy Policy</h1>
          <p>
            Inbox Outlaw is a demo inbox triage app that helps classify recent inbox messages for scams, promotions, opportunities, and routine business email. Gmail access is optional and read-only.
          </p>
        </section>

        <section className="panel" style={{ display: "grid", gap: 18 }}>
          <div>
            <h2>Google data we access</h2>
            <p>
              If you choose to connect Gmail, Inbox Outlaw requests read-only access to your Gmail account. The app may retrieve recent inbox message IDs, thread IDs, sender details, subject lines, timestamps, snippets or body text, and links so it can classify the messages and show the results in your dashboard.
            </p>
            <p>
              Inbox Outlaw does not request permission to send, modify, delete, archive, or mark Gmail messages as read.
            </p>
          </div>

          <div>
            <h2>How we use Google data</h2>
            <ul>
              <li>To show the latest synced inbox messages in your dashboard.</li>
              <li>To classify messages for scam risk, promotions, opportunities, and business context.</li>
              <li>To show explanations, matched rules, risk scores, and recommended actions.</li>
              <li>To keep a short activity trail inside the app so you can see what happened during the demo flow.</li>
            </ul>
          </div>

          <div>
            <h2>How we store data</h2>
            <p>
              OAuth tokens are stored in secure, HTTP-only cookies so the app can reconnect to Gmail after you approve access. Synced message details and classification results are stored in the app record store for the signed-in demo session and are limited to the records shown in the dashboard.
            </p>
            <p>
              Inbox Outlaw uses HTTPS in production and keeps Gmail access limited to the read-only scope needed for inbox classification.
            </p>
          </div>

          <div>
            <h2>Sharing and transfer</h2>
            <p>
              We do not sell Google user data, use it for advertising, or transfer it to unrelated third parties. Data may be processed by hosting and infrastructure providers that run the app, such as Vercel and related backend hosting, solely to provide the app experience.
            </p>
            <p>
              Inbox Outlaw does not use Google user data to train general-purpose AI models.
            </p>
          </div>

          <div>
            <h2>Google API Limited Use</h2>
            <p>
              Inbox Outlaw's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </div>

          <div>
            <h2>Your choices</h2>
            <ul>
              <li>You can use the demo sample data without connecting Gmail.</li>
              <li>You can disconnect Gmail from the dashboard at any time. Disconnecting removes the stored Gmail OAuth token for that browser session.</li>
              <li>You can also revoke access from your Google Account security settings.</li>
              <li>You may clear browser cookies and site data to remove local session cookies for this demo.</li>
            </ul>
          </div>

          <div>
            <h2>Contact</h2>
            <p>
              For privacy questions or deletion requests, contact <a href="mailto:mbma2264@gmail.com" style={{ textDecoration: "underline" }}>mbma2264@gmail.com</a>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
