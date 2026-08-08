import type { ScamReportQueueItem } from './scam-report-queue';

type EmailRow={id:string;sender_email:string;subject:string;body_text:string;category:string;risk_score:number;confidence_score:number;received_at:string|null;created_at:string};
export type ScamReportPackage={
  queueId:string;
  status:ScamReportQueueItem['status'];
  preparedAt:string;
  classification:{category:string;riskScore:number;confidenceScore:number};
  message:{senderEmail:string;senderDomain:string|null;subject:string;receivedAt:string|null};
  indicators:{linkDomains:string[];wallets:string[];phones:string[]};
  suspiciousExcerpt:string;
  corroboration:{sharedEvidenceCount:number;independentReporters:number};
  recommendedDestinations:string[];
  privacyNote:string;
};
function creds(){const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_JWT_SECRET;if(!url||!key)throw new Error('Supabase server credentials are not configured.');return{url:url.replace(/\/$/,''),key};}
async function req<T>(path:string){const{url,key}=creds();const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store'});const t=await r.text().catch(()=>'');if(!r.ok)throw new Error(`Report package request failed (${r.status})${t?`: ${t}`:''}`);return(t.trim()?JSON.parse(t):[]) as T;}
function domainOf(email:string){return(email.toLowerCase().split('@')[1]||'').trim();}
function stripHtml(raw:string){return raw.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function links(text:string){return Array.from(new Set((text.match(/https?:\/\/[^\s<>"')\]]+/gi)||[]).flatMap(v=>{try{return[new URL(v).hostname.toLowerCase().replace(/^www\./,'')];}catch{return[];}}))).slice(0,20);}
function wallets(text:string){const btc=text.match(/\b(?:bc1[a-zA-HJ-NP-Z0-9]{20,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g)||[];const eth=text.match(/\b0x[a-fA-F0-9]{40}\b/g)||[];return Array.from(new Set([...btc,...eth])).slice(0,10);}
function phones(text:string){return Array.from(new Set((text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g)||[]).map(v=>v.replace(/\D/g,'')).filter(v=>v.length>=10))).slice(0,10);}
function destinations(text:string){const d=['Email provider phishing/spam reporting'];if(/money|payment|gift card|wire|bank|crypto|bitcoin|wallet|investment|fraud/i.test(text))d.push('FTC consumer fraud reporting');if(/crypto|bitcoin|wallet|wire|bank|financial loss|stolen|investment/i.test(text))d.push('FBI IC3 cybercrime reporting when appropriate');return d;}
export async function prepareScamReportPackage(ownerEmail:string,queueId:string):Promise<ScamReportPackage>{
  const q=await req<ScamReportQueueItem[]>(`scam_report_queue?user_email=eq.${encodeURIComponent(ownerEmail)}&id=eq.${encodeURIComponent(queueId)}&select=*&limit=1`);const item=q[0];if(!item)throw new Error('Report queue item not found.');if(item.status!=='approved'&&item.status!=='submitted')throw new Error('This case must be approved before a report package can be prepared.');
  const rows=await req<EmailRow[]>(`email_records?user_email=eq.${encodeURIComponent(ownerEmail)}&id=eq.${encodeURIComponent(item.email_record_id)}&select=id,sender_email,subject,body_text,category,risk_score,confidence_score,received_at,created_at&limit=1`);const email=rows[0];if(!email)throw new Error('Source email record not found.');
  const cleaned=stripHtml(email.body_text||'');const excerpt=cleaned.slice(0,1200)+(cleaned.length>1200?'…':'');const combined=`${email.subject}\n${cleaned}`;
  return{queueId:item.id,status:item.status,preparedAt:new Date().toISOString(),classification:{category:email.category,riskScore:email.risk_score,confidenceScore:email.confidence_score},message:{senderEmail:email.sender_email,senderDomain:item.sender_domain||domainOf(email.sender_email)||null,subject:email.subject,receivedAt:email.received_at||email.created_at},indicators:{linkDomains:links(email.body_text||''),wallets:wallets(combined),phones:phones(combined)},suspiciousExcerpt:excerpt,corroboration:{sharedEvidenceCount:item.shared_evidence_count,independentReporters:item.independent_reporters},recommendedDestinations:destinations(combined),privacyNote:'This package intentionally excludes the account owner identity, unrelated mailbox content, OAuth credentials, and the complete raw email. Review the excerpt before any external submission.'};
}
