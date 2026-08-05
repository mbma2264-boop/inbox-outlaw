import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["Dashboard", "⌂", "/dashboard", ""],
  ["Inbox", "✉", "#inbox", "10"],
  ["Scam Alerts", "◈", "#inbox", "0"],
  ["Opportunities", "◎", "#inbox", "1"],
  ["Safe Senders", "✓", "#inbox", "18"],
  ["Blocked Senders", "⊘", "#inbox", "7"],
  ["Reports", "▥", "#activity", ""],
  ["Rules & Filters", "▽", "#classifier", ""],
  ["AI Training", "✦", "#classifier", "NEW"],
  ["Settings", "⚙", "#settings", ""],
  ["Help Center", "?", "#activity", ""],
];

export default function DashboardShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <main className="saasApp">
      <aside className="saasSidebar">
        <Link href="/dashboard" className="brandLockup">
          <span className="brandShield">🛡</span>
          <span><strong>INBOX <em>OUTLAW</em></strong><small>PROTECT YOUR INBOX. PROTECT YOUR PEACE.</small></span>
        </Link>

        <nav className="sideNav" aria-label="Dashboard navigation">
          {navigation.map(([label, icon, href, badge], index) => (
            <a key={label} href={href} className={index === 0 ? "active" : ""}>
              <span className="navIcon">{icon}</span><span>{label}</span>{badge ? <b>{badge}</b> : null}
            </a>
          ))}
        </nav>

        <div className="proStatus">
          <span className="brandShield mini">IO</span>
          <div><strong>Inbox Outlaw App</strong><small>Your inbox. Your rules.</small></div>
          <b>Active</b>
        </div>
      </aside>

      <section className="saasMain">
        <header className="topBar">
          <label className="globalSearch"><span>⌕</span><input placeholder="Search emails, senders, keywords..." /></label>
          <div className="topActions">
            <div className="productStatus"><span className="statusDot" />Protection active</div>
            <button className="iconButton" aria-label="Notifications">◌<i>3</i></button>
            <div className="accountChip"><span>{email.slice(0, 2).toUpperCase()}</span><div><strong>{email}</strong><small>Demo Account</small></div><i>⌄</i></div>
          </div>
        </header>
        <div className="saasContent">{children}</div>
      </section>
    </main>
  );
}
