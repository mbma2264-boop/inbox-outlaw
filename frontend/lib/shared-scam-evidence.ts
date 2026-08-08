import { createHash } from 'node:crypto';
import type { EmailInput, SharedEvidenceMatch, StoredEmailRecord } from './types';

type EvidenceType = SharedEvidenceMatch['evidence_type'];
type EvidenceLibraryRow = SharedEvidenceMatch & { first_seen_at?: string; last_seen_at?: string };

function getSupabaseCredentials() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_JWT_SECRET;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = getSupabaseCredentials();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`Shared evidence request failed (${response.status})${text ? `: ${text}` : ''}`);
  return text.trim() ? JSON.parse(text) as T : undefined as T;
}

function normalizeDomain(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0].trim();
}
function emailDomain(value: string | null | undefined) {
  return normalizeDomain(String(value || '').split('@')[1] || '');
}
function extractLinkDomains(text: string) {
  const links = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  return Array.from(new Set(links.flatMap((link) => { try { return [normalizeDomain(new URL(link).hostname)]; } catch { return []; } }).filter(Boolean)));
}
function extractWallets(text: string) {
  const bitcoin = text.match(/\b(?:bc1[a-zA-HJ-NP-Z0-9]{20,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g) || [];
  const ethereum = text.match(/\b0x[a-fA-F0-9]{40}\b/g) || [];
  return Array.from(new Set([...bitcoin, ...ethereum])).slice(0, 10);
}
function extractPhones(text: string) {
  const matches = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) || [];
  return Array.from(new Set(matches.map((value) => value.replace(/\D/g, '')).filter((value) => value.length >= 10))).slice(0, 10);
}
function reporterHash(ownerEmail: string) {
  const salt = process.env.SHARED_EVIDENCE_HASH_SALT || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'inbox-outlaw-community-evidence-v1';
  return createHash('sha256').update(`${salt}:${ownerEmail.trim().toLowerCase()}`).digest('hex');
}
function evidencePairs(record: Pick<StoredEmailRecord, 'senderEmail' | 'bodyText'>) {
  const pairs: Array<{ evidence_type: EvidenceType; evidence_value: string }> = [];
  const senderDomain = emailDomain(record.senderEmail);
  if (senderDomain) pairs.push({ evidence_type: 'sender_domain', evidence_value: senderDomain });
  for (const domain of extractLinkDomains(record.bodyText)) pairs.push({ evidence_type: 'link_domain', evidence_value: domain });
  for (const wallet of extractWallets(record.bodyText)) pairs.push({ evidence_type: 'wallet', evidence_value: wallet.toLowerCase() });
  for (const phone of extractPhones(record.bodyText)) pairs.push({ evidence_type: 'phone', evidence_value: phone });
  return Array.from(new Map(pairs.map((pair) => [`${pair.evidence_type}:${pair.evidence_value}`, pair])).values()).slice(0, 30);
}

export async function contributeScamEvidence(ownerEmail: string, record: StoredEmailRecord) {
  const reporter_hash = reporterHash(ownerEmail);
  const pairs = evidencePairs(record);
  let contributed = 0;
  for (const pair of pairs) {
    const existing = await supabaseRequest<Array<{ id: string; report_count: number }>>(`scam_evidence_reports?reporter_hash=eq.${encodeURIComponent(reporter_hash)}&evidence_type=eq.${pair.evidence_type}&evidence_value=eq.${encodeURIComponent(pair.evidence_value)}&select=id,report_count&limit=1`);
    if (existing[0]) {
      await supabaseRequest(`scam_evidence_reports?id=eq.${encodeURIComponent(existing[0].id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ report_count: Number(existing[0].report_count || 1) + 1, last_seen_at: new Date().toISOString() }) });
    } else {
      await supabaseRequest('scam_evidence_reports', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ reporter_hash, ...pair }) });
    }
    contributed += 1;
  }
  return contributed;
}

function indicatorsForEmail(email: EmailInput) {
  const items: Array<{ type: EvidenceType; value: string }> = [];
  const senderDomain = emailDomain(email.sender_email);
  if (senderDomain) items.push({ type: 'sender_domain', value: senderDomain });
  const replyDomain = emailDomain(email.reply_to);
  if (replyDomain) items.push({ type: 'reply_domain', value: replyDomain });
  for (const link of email.links || []) { try { const domain = normalizeDomain(new URL(link).hostname); if (domain) items.push({ type: 'link_domain', value: domain }); } catch {} }
  for (const wallet of extractWallets(`${email.subject}\n${email.body_text}`)) items.push({ type: 'wallet', value: wallet.toLowerCase() });
  for (const phone of extractPhones(`${email.subject}\n${email.body_text}`)) items.push({ type: 'phone', value: phone });
  return Array.from(new Map(items.map((item) => [`${item.type}:${item.value}`, item])).values()).slice(0, 30);
}

export async function findSharedEvidenceMatches(email: EmailInput): Promise<SharedEvidenceMatch[]> {
  const matches: SharedEvidenceMatch[] = [];
  for (const indicator of indicatorsForEmail(email)) {
    const rows = await supabaseRequest<EvidenceLibraryRow[]>(`scam_evidence_library?evidence_type=eq.${indicator.type}&evidence_value=eq.${encodeURIComponent(indicator.value)}&select=evidence_type,evidence_value,independent_reporters,total_reports,confidence_level&limit=1`);
    if (rows[0]) matches.push(rows[0]);
  }
  return matches.sort((a, b) => b.independent_reporters - a.independent_reporters).slice(0, 10);
}
