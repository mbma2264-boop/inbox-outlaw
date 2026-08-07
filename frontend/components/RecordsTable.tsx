'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReviewState, StoredEmailRecord } from '../lib/types';

const categoryTone: Record<string, string> = {
  Scam: '#ff4d6d', 'Likely Scam': '#ff8c42', Opportunity: '#36d399', Promotion: '#5aa9ff',
  Transactional: '#7c8cff', 'Verified Business': '#36d399', Personal: '#f4d35e', 'Needs Review': '#c5cad6',
};

const specialFilters = ['Scam Alerts', 'Opportunities', 'Safe Senders', 'Blocked Senders'] as const;

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function signalList(record: StoredEmailRecord) {
  const text = `${record.subject} ${record.bodyText}`.toLowerCase();
  const signals: string[] = [];
  if (/urgent|immediately|act now|final notice|limited time/.test(text)) signals.push('Uses urgent or time-pressure language');
  if (/bitcoin|crypto|wallet|gift card|wire transfer|cash app/.test(text)) signals.push('Mentions a high-risk payment method');
  if (/password|login|verify your account|security alert|suspended/.test(text)) signals.push('Requests or references account-security action');
  if (/prize|lottery|winner|grant|compensation|inheritance/.test(text)) signals.push('Contains prize, grant, or unexpected-payment language');
  if (/irs|department of justice|federal|government|social security/.test(text)) signals.push('Uses government or authority language');
  if (/loan|financing|investment|profit|returns/.test(text)) signals.push('Contains financial-offer language');
  if (record.riskScore >= 70) signals.push('Overall risk score is in the high-risk range');
  if (record.confidenceScore < 60) signals.push('Classification confidence is limited; manual review is advised');
  if (signals.length === 0) signals.push('No major rule-based warning signal was detected');
  return signals.slice(0, 5);
}

function matchesView(record: StoredEmailRecord, view: string, review: ReviewState) {
  if (view === 'All') return true;
  if (view === 'Scam Alerts') return review === 'scam' || record.category === 'Scam' || record.category === 'Likely Scam';
  if (view === 'Opportunities') return review === 'opportunity' || record.category === 'Opportunity';
  if (view === 'Safe Senders') return review === 'safe';
  if (view === 'Blocked Senders') return review === 'scam';
  return record.category === view;
}

export default function RecordsTable({ records }: { records: StoredEmailRecord[] }) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState('All');
  const [selected, setSelected] = useState<StoredEmailRecord | null>(null);
  const [reviewState, setReviewState] = useState<Record<string, ReviewState>>({});
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReviewState(Object.fromEntries(records.map((record) => [record.id, record.reviewState ?? null])));
  }, [records]);

  useEffect(() => {
    const onFilter = (event: Event) => {
      const requested = (event as CustomEvent<string>).detail || 'All';
      const categories = new Set(records.map((record) => record.category));
      const validSpecial = (specialFilters as readonly string[]).includes(requested);
      setView(requested === 'All' || validSpecial || categories.has(requested) ? requested : 'All');
      setQuery('');
    };
    const onSearch = (event: Event) => setQuery((event as CustomEvent<string>).detail || '');
    window.addEventListener('inbox-filter', onFilter);
    window.addEventListener('inbox-search', onSearch);
    return () => {
      window.removeEventListener('inbox-filter', onFilter);
      window.removeEventListener('inbox-search', onSearch);
    };
  }, [records]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(records.map((record) => record.category)))], [records]);
  const filtered = useMemo(() => records.filter((record) => {
    const reviewed = reviewState[record.id] ?? record.reviewState ?? null;
    const haystack = `${record.senderName || ''} ${record.senderEmail} ${record.subject} ${record.bodyText}`.toLowerCase();
    return matchesView(record, view, reviewed) && haystack.includes(query.toLowerCase());
  }), [records, query, reviewState, view]);

  const title = view === 'All' ? 'Recent classified emails' : view;
  const emptyCopy = view === 'Safe Senders'
    ? 'No senders have been marked safe yet.'
    : view === 'Blocked Senders'
      ? 'No senders have been blocked yet.'
      : view === 'Scam Alerts'
        ? 'No scam alerts match this view.'
        : view === 'Opportunities'
          ? 'No saved or detected opportunities match this view.'
          : 'Change the search term or category filter.';

  async function saveReview(record: StoredEmailRecord, state: ReviewState, applyToSender = false) {
    try {
      setSaving(true);
      setNotice(applyToSender ? 'Updating sender list…' : state ? 'Saving review…' : 'Removing review…');
      const response = await fetch('/api/email-records', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, senderEmail: record.senderEmail, reviewState: state, applyToSender }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; record?: StoredEmailRecord; records?: StoredEmailRecord[] } | null;
      if (!response.ok || !payload?.record) throw new Error(payload?.error || 'Unable to save review.');

      if (applyToSender && payload.records) {
        setReviewState((current) => {
          const next = { ...current };
          for (const changed of payload.records || []) next[changed.id] = changed.reviewState;
          return next;
        });
      } else {
        setReviewState((current) => ({ ...current, [record.id]: state }));
      }

      setSelected(payload.record);
      if (applyToSender) {
        setNotice(state === 'safe' ? 'Sender added to Safe Senders.' : state === 'scam' ? 'Sender added to Blocked Senders.' : 'Sender decision removed.');
      } else {
        setNotice(state === 'safe' ? 'Marked safe and saved.' : state === 'scam' ? 'Reported as scam and saved.' : state === 'opportunity' ? 'Saved as an opportunity.' : 'Review decision removed.');
      }
      window.dispatchEvent(new Event('inbox-records-updated'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save review.');
    } finally { setSaving(false); }
  }

  async function copyAnalysis(record: StoredEmailRecord) {
    const report = ['Inbox Outlaw Email Analysis', `Sender: ${record.senderName || record.senderEmail} <${record.senderEmail}>`, `Subject: ${record.subject}`, `Classification: ${record.category}`, `Risk: ${record.riskScore}/100`, `Confidence: ${record.confidenceScore}%`, `Recommendation: ${record.recommendedAction || 'Review carefully before taking action.'}`, 'Signals:', ...signalList(record).map((signal) => `- ${signal}`)].join('\n');
    await navigator.clipboard.writeText(report); setNotice('Analysis copied to the clipboard.');
  }

  return (
    <section className="inboxPanel" id="inbox">
      <div className="inboxToolbar">
        <div><span className="eyebrow">SMART INBOX</span><h2>{title}</h2><p className="subtle">Select a message to see its risk explanation and recommended action.</p></div>
        <label className="tableSearch"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sender or subject" /></label>
      </div>
      <div className="filterRow" aria-label="Email category filters">{categories.map((item) => <button type="button" key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>)}</div>
      {records.length === 0 ? <div className="emptyState"><strong>No saved emails yet</strong><p>Sync Gmail and your classified messages will appear here.</p></div> : filtered.length === 0 ? <div className="emptyState"><strong>No matching emails</strong><p>{emptyCopy}</p></div> : (
        <div className="recordsTableWrap"><table className="recordsTable modernTable"><thead><tr><th>Sender</th><th>Subject</th><th>Category</th><th>Risk</th><th>Confidence</th><th>Received</th></tr></thead><tbody>
          {filtered.map((record) => { const tone = categoryTone[record.category] || '#fff'; const reviewed = reviewState[record.id] ?? record.reviewState; return (
            <tr key={record.id} onClick={() => { setSelected({ ...record, reviewState: reviewed ?? null }); setNotice(''); }} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelected({ ...record, reviewState: reviewed ?? null })}>
              <td><div className="senderCell"><span className="senderAvatar" style={{ borderColor: tone }}>{initials(record.senderName, record.senderEmail)}</span><div><strong>{record.senderName || 'Unknown sender'}</strong><small>{record.senderEmail}</small></div></div></td>
              <td><strong>{record.subject}</strong><small className="clamp2">{record.bodyText}</small>{reviewed ? <small className={`reviewTag ${reviewed}`}>{reviewed === 'safe' ? '✓ Safe sender' : reviewed === 'scam' ? '⊘ Blocked sender' : '★ Saved opportunity'}</small> : null}</td>
              <td><span className="categoryBadge" style={{ color: tone, borderColor: `${tone}66`, background: `${tone}14` }}>{record.category}</span></td>
              <td><div className="scoreCell"><strong>{record.riskScore}/100</strong><span><i style={{ width: `${record.riskScore}%`, background: record.riskScore >= 70 ? '#ff4d6d' : record.riskScore >= 40 ? '#ffb020' : '#36d399' }} /></span></div></td>
              <td><div className="scoreCell"><strong>{record.confidenceScore}%</strong><span><i style={{ width: `${record.confidenceScore}%` }} /></span></div></td>
              <td>{new Date(record.receivedAt || record.createdAt).toLocaleString()}</td>
            </tr>); })}
        </tbody></table></div>
      )}
      {selected ? <div className="drawerBackdrop" onClick={() => setSelected(null)}><aside className="emailDrawer" onClick={(event) => event.stopPropagation()}>
        <button className="drawerClose" onClick={() => setSelected(null)} aria-label="Close email details">×</button><span className="eyebrow">AI EMAIL ANALYSIS</span><h2>{selected.subject}</h2><p className="drawerSender">From <strong>{selected.senderName || selected.senderEmail}</strong><br />{selected.senderEmail}</p>
        <div className="drawerScoreGrid"><div><small>Risk score</small><strong>{selected.riskScore}/100</strong></div><div><small>Confidence</small><strong>{selected.confidenceScore}%</strong></div></div>
        <div className="analysisBlock"><h3>Classification</h3><span className="categoryBadge" style={{ color: categoryTone[selected.category] || '#fff' }}>{selected.category}</span></div>
        <div className="analysisBlock"><h3>Why Inbox Outlaw classified it</h3><ul className="signalList">{signalList(selected).map((signal) => <li key={signal}>{signal}</li>)}</ul></div>
        <div className="analysisBlock"><h3>Recommended action</h3><p>{selected.recommendedAction || 'Review carefully before taking action.'}</p></div>
        <div className="analysisBlock"><h3>Email preview</h3><p>{selected.bodyText || 'No body preview available.'}</p></div>
        {notice ? <div className="actionNotice">{notice}</div> : null}
        <div className="drawerActions three"><button disabled={saving} className="safeAction" onClick={() => void saveReview(selected, 'safe')}>Mark email safe</button><button disabled={saving} className="dangerAction" onClick={() => void saveReview(selected, 'scam')}>Report email scam</button><button disabled={saving} className="copyAction" onClick={() => void saveReview(selected, 'opportunity')}>Save opportunity</button></div>
        <div className="drawerActions"><button disabled={saving} className="safeAction" onClick={() => void saveReview(selected, 'safe', true)}>Add sender to Safe Senders</button><button disabled={saving} className="dangerAction" onClick={() => void saveReview(selected, 'scam', true)}>Add sender to Blocked Senders</button></div>
        {selected.reviewState ? <button disabled={saving} className="copyAction fullWidth" onClick={() => void saveReview(selected, null, selected.reviewState === 'safe' || selected.reviewState === 'scam')}>Undo current decision</button> : null}
        <button className="copyAction fullWidth" onClick={() => void copyAnalysis(selected)}>Copy analysis</button><p className="sessionNote">Safe and blocked sender decisions apply inside Inbox Outlaw. They do not delete, move, or alter the original Gmail message.</p>
      </aside></div> : null}
    </section>
  );
}
