'use client';

import { useMemo, useState } from "react";
import type { ClassificationResult, StoredEmailRecord } from "../lib/types";

type SaveResponse = {
  result: ClassificationResult;
  record: StoredEmailRecord;
};

const sampleBody =
  "Urgent! Pay a processing fee to release your funds immediately. Act now within 24 hours.";

export default function ClassifierForm({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const [senderName, setSenderName] = useState("Bank Security Team");
  const [senderEmail, setSenderEmail] = useState("securitynotice@gmail.com");
  const [subject, setSubject] = useState("Urgent: pay fee to release funds");
  const [bodyText, setBodyText] = useState(sampleBody);
  const [links, setLinks] = useState("https://bit.ly/example");
  const [knownContact, setKnownContact] = useState(false);
  const [inReplyThread, setInReplyThread] = useState(false);
  const [starred, setStarred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [savedRecord, setSavedRecord] = useState<StoredEmailRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkArray = useMemo(
    () => links.split(",").map((item) => item.trim()).filter(Boolean),
    [links]
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setSavedRecord(null);

    try {
      const response = await fetch(`/api/email-records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender_name: senderName,
          sender_email: senderEmail,
          subject,
          body_text: bodyText,
          links: linkArray,
          known_contact: knownContact,
          in_reply_thread: inReplyThread,
          starred,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `API returned ${response.status}`);
      }

      const data = (await response.json()) as SaveResponse;
      setResult(data.result);
      setSavedRecord(data.record);
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Try the classifier</h2>
      <p>Analyze a sample email, then save the labeled result into SQLite-backed inbox records.</p>

      <form onSubmit={onSubmit}>
        <label>Sender name</label>
        <input className="input" value={senderName} onChange={(e) => setSenderName(e.target.value)} />

        <label>Sender email</label>
        <input className="input" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />

        <label>Subject</label>
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />

        <label>Body text</label>
        <textarea className="textarea" value={bodyText} onChange={(e) => setBodyText(e.target.value)} />

        <label>Links (comma separated)</label>
        <input className="input" value={links} onChange={(e) => setLinks(e.target.value)} />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <label><input type="checkbox" checked={knownContact} onChange={(e) => setKnownContact(e.target.checked)} /> Known contact</label>
          <label><input type="checkbox" checked={inReplyThread} onChange={(e) => setInReplyThread(e.target.checked)} /> In reply thread</label>
          <label><input type="checkbox" checked={starred} onChange={(e) => setStarred(e.target.checked)} /> Starred</label>
        </div>

        <button className="button" disabled={loading}>
          {loading ? "Analyzing and saving..." : "Analyze and save"}
        </button>
      </form>

      {error ? <p style={{ color: "#ff8ea1" }}>Error: {error}</p> : null}

      {savedRecord ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Saved to inbox records</h3>
          <p>
            Record ID: <span className="subtle">{savedRecord.id}</span>
          </p>
          <p>Saved at: {new Date(savedRecord.createdAt).toLocaleString()}</p>
        </div>
      ) : null}

      {result ? (
        <div style={{ marginTop: 24 }}>
          <div className="resultRow">
            <div className="card">
              <h3>{result.category}</h3>
              <p>Risk: {result.risk_score}/100</p>
              <p>Confidence: {result.confidence_score}/100</p>
              <p>Recommended action: {result.recommended_action}</p>
              <p>Used LLM: {result.used_llm ? "Yes" : "No"}</p>
            </div>

            <div className="card">
              <h3>Why it was labeled this way</h3>
              <ul>
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Matched rules</h3>
            <div>
              {result.matched_rules.map((rule) => (
                <span className="badge" key={rule.rule_id}>
                  {rule.rule_id} ({rule.weight})
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
