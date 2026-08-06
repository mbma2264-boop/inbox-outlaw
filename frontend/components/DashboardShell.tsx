'use client';

import Link from "next/link";
import { useState, type ReactNode } from "react";

type NavItem = { label: string; icon: string; target: string; badge?: string; filter?: string };

const navigation: NavItem[] = [
  { label: "Dashboard", icon: "⌂", target: "top" },
  { label: "Inbox", icon: "✉", target: "inbox", badge: "10", filter: "All" },
  { label: "Scam Alerts", icon: "◈", target: "inbox", badge: "0", filter: "Scam" },
  { label: "Opportunities", icon: "◎", target: "inbox", badge: "1", filter: "Opportunity" },
  { label: "Safe Senders", icon: "✓", target: "inbox", badge: "18", filter: "Verified Business" },
  { label: "Blocked Senders", icon: "⊘", target: "inbox", badge: "7", filter: "Likely Scam" },
  { label: "Reports", icon: "▥", target: "activity" },
  { label: "Rules & Filters", icon: "▽", target: "classifier" },
  { label: "AI Training", icon: "✦", target: "classifier", badge: "NEW" },
  { label: "Settings", icon: "⚙", target: "settings" },
  { label: "Help Center", icon: "?", target: "activity" },
];

function scrollToTarget(target: string) {
  if (target === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function DashboardShell({ email, children }: { email: string; children: ReactNode }) {
  const [active, setActive] = useState("Dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");

  function activate(item: NavItem) {
    setActive(item.label);
    if (item.filter) window.dispatchEvent(new CustomEvent("inbox-filter", { detail: item.filter }));
    scrollToTarget(item.target);
  }

  function submitSearch(value: string) {
    setSearch(value);
    window.dispatchEvent(new CustomEvent("inbox-search", { detail: value }));
    if (value.trim()) scrollToTarget("inbox");
  }

  return (
    <main className="saasApp" id="top">
      <aside className="saasSidebar">
        <Link href="/dashboard" className="brandLockup">
          <span className="brandShield">🛡</span>
          <span><strong>INBOX <em>OUTLAW</em></strong><small>PROTECT YOUR INBOX. PROTECT YOUR PEACE.</small></span>
        </Link>

        <nav className="sideNav" aria-label="Dashboard navigation">
          {navigation.map((item) => (
            <button key={item.label} type="button" onClick={() => activate(item)} className={active === item.label ? "active" : ""}>
              <span className="navIcon">{item.icon}</span><span>{item.label}</span>{item.badge ? <b>{item.badge}</b> : null}
            </button>
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
          <label className="globalSearch"><span>⌕</span><input value={search} onChange={(event) => submitSearch(event.target.value)} placeholder="Search emails, senders, keywords..." /></label>
          <div className="topActions">
            <div className="productStatus"><span className="statusDot" />Protection active</div>
            <div className="menuWrap">
              <button type="button" className="iconButton" aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}>◌<i>3</i></button>
              {notificationsOpen ? <div className="headerMenu"><strong>Notifications</strong><p>Gmail protection is active.</p><p>Open the inbox to review classified messages.</p></div> : null}
            </div>
            <div className="menuWrap">
              <button type="button" className="accountChip" onClick={() => setAccountOpen((open) => !open)}><span>{email.slice(0, 2).toUpperCase()}</span><div><strong>{email}</strong><small>Demo Account</small></div><i>⌄</i></button>
              {accountOpen ? <div className="headerMenu accountMenu"><strong>Account</strong><p>{email}</p><a href="/api/auth/logout">Log out</a></div> : null}
            </div>
          </div>
        </header>
        <div className="saasContent">{children}</div>
      </section>
    </main>
  );
}
