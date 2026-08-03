import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["Dashboard", "⌂", "/dashboard"],
  ["Inbox", "✉", "#inbox"],
  ["Scam Alerts", "◈", "#inbox"],
  ["Opportunities", "◎", "#inbox"],
  ["Safe Senders", "♢", "#inbox"],
  ["Blocked Senders", "⊘", "#inbox"],
  ["Reports", "▥", "#activity"],
  ["AI Training", "✦", "#classifier"],
  ["Settings", "⚙", "#settings"],
];

export default function DashboardShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <main className="saasApp">
      <aside className="saasSidebar">
        <Link href="/dashboard" className="brandLockup">
          <span className="brandShield">IO</span>
          <span><strong>INBOX <em>OUTLAW</em></strong><small>Protect your inbox. Protect your peace.</small></span>
        </Link>

        <nav className="sideNav" aria-label="Dashboard navigation">
          {navigation.map(([label, icon, href], index) => (
            <a key={label} href={href} className={index === 0 ? "active" : ""}>
              <span className="navIcon">{icon}</span><span>{label}</span>{label === "AI Training" ? <b>NEW</b> : null}
            </a>
          ))}
        </nav>

        <div className="upgradeCard">
          <span className="upgradeIcon">♛</span>
          <strong>Go beyond basic protection</strong>
          <p>Unlock advanced AI scanning, real-time alerts, and priority support.</p>
          <button type="button">Upgrade to Pro</button>
        </div>

        <div className="proStatus"><span className="brandShield mini">IO</span><div><strong>Inbox Outlaw Pro</strong><small>Your inbox. Your rules.</small></div><b>Active</b></div>
      </aside>

      <section className="saasMain">
        <header className="topBar">
          <label className="globalSearch"><span>⌕</span><input aria-label="Search emails" placeholder="Search emails, senders, keywords..." /></label>
          <div className="topActions"><button className="upgradeTop">♛ Upgrade to Pro</button><button className="iconButton" aria-label="Notifications">♧<i>3</i></button><div className="accountChip"><span>{email.slice(0, 2).toUpperCase()}</span><div><strong>{email}</strong><small>Demo Account</small></div></div></div>
        </header>
        <div className="saasContent">{children}</div>
      </section>
    </main>
  );
}
