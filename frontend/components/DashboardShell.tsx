'use client';

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type NavItem = { label: string; icon: string; target: string; filter?: string };
type LiveCounts = { total: number; scams: number; opportunities: number; safe: number; blocked: number };

const navigation: NavItem[] = [
  { label: "Dashboard", icon: "⌂", target: "top" },
  { label: "Inbox", icon: "✉", target: "inbox", filter: "All" },
  { label: "Scam Alerts", icon: "◈", target: "inbox", filter: "Scam" },
  { label: "Opportunities", icon: "◎", target: "inbox", filter: "Opportunity" },
  { label: "Safe Senders", icon: "✓", target: "inbox", filter: "Verified Business" },
  { label: "Blocked Senders", icon: "⊘", target: "inbox", filter: "Likely Scam" },
  { label: "Reports", icon: "▥", target: "activity" },
  { label: "Rules & Filters", icon: "▽", target: "classifier" },
  { label: "AI Training", icon: "✦", target: "classifier" },
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

function badgeFor(label: string, counts: LiveCounts) {
  if (label === "Inbox") return counts.total;
  if (label === "Scam Alerts") return counts.scams;
  if (label === "Opportunities") return counts.opportunities;
  if (label === "Safe Senders") return counts.safe;
  if (label === "Blocked Senders") return counts.blocked;
  if (label === "AI Training") return "NEW";
  return null;
}

export default function DashboardShell({ email, children }: { email: string; children: ReactNode }) {
  const [active, setActive] = useState("Dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<LiveCounts>({ total: 0, scams: 0, opportunities: 0, safe: 0, blocked: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const response = await fetch('/api/email-records', { cache: 'no-store' });
        const payload = await response.json().catch(() => null) as { records?: Array<{ category?: string; reviewState?: string | null }>; summary?: { total?: number; scams?: number; opportunities?: number } } | null;
        if (!response.ok || !payload || cancelled) return;
        const records = payload.records || [];
        setCounts({
          total: Number(payload.summary?.total ?? records.length),
          scams: Number(payload.summary?.scams ?? records.filter((record) => record.category === 'Scam' || record.category === 'Likely Scam').length),
          opportunities: Number(payload.summary?.opportunities ?? records.filter((record) => record.category === 'Opportunity').length),
          safe: records.filter((record) => record.reviewState === 'safe' || record.category === 'Verified Business').length,
          blocked: records.filter((record) => record.reviewState === 'scam').length,
        });
      } catch {
        // Keep the last confirmed counts when the dashboard API is temporarily unavailable.
      }
    }

    void loadCounts();
    const timer = window.setInterval(loadCounts, 15000);
    window.addEventListener('focus', loadCounts);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', loadCounts);
    };
  }, []);

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
          {navigation.map((item) => {
            const badge = badgeFor(item.label, counts);
            return (
              <button key={item.label} type="button" onClick={() => activate(item)} className={active === item.label ? "active" : ""}>
                <span className="navIcon">{item.icon}</span><span>{item.label}</span>{badge !== null ? <b>{badge}</b> : null}
              </button>
            );
          })}
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
              <button type="button" className="iconButton" aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}>◌<i>{counts.scams}</i></button>
              {notificationsOpen ? <div className="headerMenu"><strong>Notifications</strong><p>{counts.scams ? `${counts.scams} scam alert${counts.scams === 1 ? '' : 's'} need review.` : 'No scam alerts need review.'}</p><p>{counts.total} email records are currently protected.</p></div> : null}
            </div>
            <div className="menuWrap">
              <button type="button" className="accountChip" onClick={() => setAccountOpen((open) => !open)}><span>{email.slice(0, 2).toUpperCase()}</span><div><strong>{email}</strong><small>Inbox Outlaw Account</small></div><i>⌄</i></button>
              {accountOpen ? <div className="headerMenu accountMenu"><strong>Account</strong><p>{email}</p><a href="/api/auth/logout">Log out</a></div> : null}
            </div>
          </div>
        </header>
        <div className="saasContent">{children}</div>
      </section>
    </main>
  );
}
