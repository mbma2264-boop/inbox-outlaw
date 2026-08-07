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
  { label: "Reports", icon: "▥", target: "reports" },
  { label: "Rules & Filters", icon: "▽", target: "classifier" },
  { label: "AI Training", icon: "✦", target: "classifier" },
  { label: "Settings", icon: "⚙", target: "settings-panel" },
  { label: "Help Center", icon: "?", target: "help-center" },
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
  const [dailyAlerts, setDailyAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [lastAutoSync, setLastAutoSync] = useState<string | null>(null);
  const [counts, setCounts] = useState<LiveCounts>({ total: 0, scams: 0, opportunities: 0, safe: 0, blocked: 0 });

  useEffect(() => {
    try {
      setDailyAlerts(window.localStorage.getItem('inbox-outlaw-daily-alerts') !== 'false');
      setAutoSync(window.localStorage.getItem('inbox-outlaw-auto-sync') === 'true');
      setLastAutoSync(window.localStorage.getItem('inbox-outlaw-last-auto-sync'));
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem('inbox-outlaw-daily-alerts', String(dailyAlerts));
    window.localStorage.setItem('inbox-outlaw-auto-sync', String(autoSync));
  }, [dailyAlerts, autoSync, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded || !autoSync) return;

    const requestSync = () => {
      const timestamp = new Date().toISOString();
      window.dispatchEvent(new CustomEvent('gmail-auto-sync-request'));
      window.localStorage.setItem('inbox-outlaw-last-auto-sync', timestamp);
      setLastAutoSync(timestamp);
    };

    const timer = window.setInterval(requestSync, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [autoSync, preferencesLoaded]);

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
    window.addEventListener('inbox-records-updated', loadCounts);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', loadCounts);
      window.removeEventListener('inbox-records-updated', loadCounts);
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

  const reviewed = counts.safe + counts.blocked;
  const reviewRate = counts.total ? Math.min(100, Math.round((reviewed / counts.total) * 100)) : 0;

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

        <div className="saasContent">
          {children}

          <section className="controlPanel" id="reports">
            <div className="controlCopy">
              <span className="eyebrow">REPORTS</span>
              <h2>Inbox protection report</h2>
              <p>Live totals from the email records currently saved to this Inbox Outlaw account.</p>
            </div>
            <div className="referenceMetricGrid">
              <article className="referenceMetric pinkMetric"><div><span>Threat alerts</span><strong>{counts.scams}</strong><small>Scam-classified or reported records</small></div></article>
              <article className="referenceMetric greenMetric"><div><span>Safe senders</span><strong>{counts.safe}</strong><small>Messages or senders reviewed safe</small></div></article>
              <article className="referenceMetric blueMetric"><div><span>Reviewed</span><strong>{reviewRate}%</strong><small>{reviewed} of {counts.total} records reviewed</small></div></article>
              <article className="referenceMetric roseMetric"><div><span>Opportunities</span><strong>{counts.opportunities}</strong><small>Potential business opportunities found</small></div></article>
            </div>
          </section>

          <section className="controlPanel" id="settings-panel">
            <div className="controlCopy">
              <span className="eyebrow">SETTINGS</span>
              <h2>Protection preferences</h2>
              <p>Preferences are saved in this browser. Gmail access remains read-only.</p>
            </div>
            <div className="controlActions">
              <button type="button" className={`button secondary ${dailyAlerts ? '' : 'quiet'}`} onClick={() => setDailyAlerts((enabled) => !enabled)}>{dailyAlerts ? 'Daily alerts enabled' : 'Daily alerts disabled'}</button>
              <button type="button" className={`button secondary ${autoSync ? '' : 'quiet'}`} onClick={() => setAutoSync((enabled) => !enabled)}>{autoSync ? 'Auto-sync every 5 minutes' : 'Auto-sync is off'}</button>
              <button type="button" className="button secondary" onClick={() => window.dispatchEvent(new CustomEvent('gmail-auto-sync-request'))}>Sync Gmail now</button>
              <a className="button secondary" href="/api/auth/logout">Log out securely</a>
            </div>
            <div className="controlStatus">Connected account: {email}. {lastAutoSync ? `Last automatic sync request: ${new Date(lastAutoSync).toLocaleString()}. ` : ''}Inbox Outlaw does not send, delete, archive, or mark Gmail messages as read.</div>
          </section>

          <section className="controlPanel" id="help-center">
            <div className="controlCopy">
              <span className="eyebrow">HELP CENTER</span>
              <h2>Using Inbox Outlaw</h2>
              <p>Sync Gmail, open a classified message, review the warning signals, then mark the email or sender as safe, blocked, scam, or opportunity.</p>
            </div>
            <div className="controlActions">
              <button type="button" className="button secondary" onClick={() => scrollToTarget('inbox')}>Open smart inbox</button>
              <button type="button" className="button secondary" onClick={() => scrollToTarget('settings-panel')}>Open settings</button>
              <a className="button secondary" href="mailto:support@inboxoutlaw.app">Contact support</a>
            </div>
            <div className="controlStatus">For suspicious messages, do not click links, send money, share passwords, or provide verification codes until the sender is independently verified.</div>
          </section>
        </div>
      </section>
    </main>
  );
}
