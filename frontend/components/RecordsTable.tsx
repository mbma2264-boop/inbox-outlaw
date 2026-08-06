'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReviewState, StoredEmailRecord } from '../lib/types';

const categoryTone: Record<string, string> = {
  Scam: '#ff4d6d', 'Likely Scam': '#ff8c42', Opportunity: '#36d399', Promotion: '#5aa9ff',
  Transactional: '#7c8cff', 'Verified Business': '#36d399', Personal: '#f4d35e', 'Needs Review': '#c5cad6',
};

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

export default function RecordsTable({ records }: { records: StoredEmailRecord[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
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
      const available = new Set(records.map((record) => record.category));
      setCategory(requested === 'All' || available.has(requested) ? requested : 'All');
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
    const matchesCategory = category === 'All' || record.category === category;
    const haystack = `${record.senderName || ''} ${record.senderEmail} ${record.subject} ${record.bodyText}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [records, query, category]);

  async function saveReview(record: StoredEmailRecord, state: Exclude<ReviewState, null>) {
    try {
      setSaving(true); setNotice('Saving review…');
      const response = await fetch('/api/email-records', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, reviewState: state }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; record?: StoredEmailRecord } | null;
      if (!response.ok || !payload?.record) throw new Error(payload?.error || 'Unable to save review.');
      setReviewState((current) => ({ ...current, [record.id]: state }));
      setSelected(payload.record);
      setNotice(state === 'safe' ? 'Marked safe and saved.' : state === 'scam' ? 'Reported as scam and saved.' : 'Saved as an opportunity.');
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
        <div><span className="eyebrow">SMART INBOX</span><h2>Recent classified emails</h2><p className="subtle">Select a message to see its risk explanation and recommended action.</p></div>
        <label className="tableSearch"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sender or subject" /></label>
      </div>
      <div className="filterRow" aria-label="Email category filters">{categories.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {records.length === 0 ? <div className="emptyState"><strong>No saved emails yet</strong><p>Sync Gmail and your classified messages will appear here.</p></div> : filtered.length === 0 ? <div className="emptyState"><strong>No matching emails</strong><p>Change the search term or category filter.</p></div> : (
        <div className="recordsTableWrap"><table className="recordsTable modernTable"><thead><tr><th>Sender</th><th>Subject</th><th>Category</th><th>Risk</th><th>Confidence</th><th>Received</th></tr></thead><tbody>
          {filtered.map((record) => { const tone = categoryTone[record.category] || '#fff'; const reviewed = reviewState[record.id]; return (
            <tr key={record.id} onClick={() => { setSelected({ ...record, reviewState: reviewed ?? null }); setNotice(''); }} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelected(record)}>
              <td><div className="senderCell"><span className="senderAvatar" style={{ borderColor: tone }}>{initials(record.senderName, record.senderEmail)}</span><div><strong>{record.senderName || 'Unknown sender'}</strong><small>{record.senderEmail}</small></div></div></td>
              <td><strong>{record.subject}</strong><small className="clamp2">{record.bodyText}</small>{reviewed ? <small className={`reviewTag ${reviewed}`}>{reviewed === 'safe' ? '✓ Reviewed safe' : reviewed === 'scam' ? '⚠ Reported scam' : '★ Saved opportunity'}</small> : null}</td>
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
        <div className="analysisBlock"><h3>Why Inbox Outlaw flagged it</h3><ul className="signalList">{signalList(selected).map((signal) => <li key={signal}>{signal}</li>)}</ul></div>
        <div className="analysisBlock"><h3>Recommended action</h3><p>{selected.recommendedAction || 'Review carefully before taking action.'}</p></div>
        <div className="analysisBlock"><h3>Email preview</h3><p>{selected.bodyText || 'No body preview available.'}</p></div>
        {notice ? <div className="actionNotice">{notice}</div> : null}
        <div className="drawerActions three"><button disabled={saving} className="safeAction" onClick={() => void saveReview(selected, 'safe')}>Mark safe</button><button disabled={saving} className="dangerAction" onClick={() => void saveReview(selected, 'scam')}>Report scam</button><button disabled={saving} className="copyAction" onClick={() => void saveReview(selected, 'opportunity')}>Save opportunity</button></div>
        <button className="copyAction fullWidth" onClick={() => void copyAnalysis(selected)}>Copy analysis</button><p className="sessionNote">Review labels are saved to the Inbox Outlaw record. They do not change or delete the original Gmail message.</p>
      </aside></div> : null}
    </section>
  );
}
