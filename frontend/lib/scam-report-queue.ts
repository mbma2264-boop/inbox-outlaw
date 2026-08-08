import type { SharedEvidenceMatch, StoredEmailRecord } from './types';

export type ScamReportQueueItem = {
  id: string;
  email_record_id: string;
  sender_email: string;
  sender_domain: string | null;
  subject: string | null;
  category: string;
  risk_score: number;
  confidence_score: number;
  shared_evidence_count: number;
  independent_reporters: number;
  status: 'pending_review' | 'approved' | 'dismissed' | 'submitted';
  destination: string | null;
  created_at: string;
  reviewed_at: string | null;
  submitted_at: string | null;
};

function getSupabaseCredentials(){const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_JWT_SECRET;if(!url||!key)throw new Error('Supabase server credentials are not configured.');return{url:url.replace(/\/$/,''),key};}
async function supabaseRequest<T>(path:string,init:RequestInit={}):Promise<T>{const{url,key}=getSupabaseCredentials();const response=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...init.headers},cache:'no-store'});const text=await response.text().catch(()=>'');if(!response.ok)throw new Error(`Scam report queue request failed (${response.status})${text?`: ${text}`:''}`);return text.trim()?JSON.parse(text) as T:undefined as T;}
function domainOf(email:string){return(email.trim().toLowerCase().split('@')[1]||'').trim();}

export function shouldQueueForExternalReview(record:StoredEmailRecord,matches:SharedEvidenceMatch[]){
  const independentReporters=Math.max(0,...matches.map(m=>m.independent_reporters||0));
  const highCommunityMatch=matches.some(m=>m.confidence_level==='high'||m.independent_reporters>=5);
  const mediumCommunityMatch=matches.some(m=>m.confidence_level==='medium'||m.independent_reporters>=3);
  const strongClassification=record.category==='Likely Scam'&&record.riskScore>=75&&record.confidenceScore>=80;
  const veryStrongClassification=record.category==='Likely Scam'&&record.riskScore>=88&&record.confidenceScore>=90;
  return {
    eligible: (strongClassification&&mediumCommunityMatch)||veryStrongClassification||highCommunityMatch,
    independentReporters,
    sharedEvidenceCount:matches.length,
    reason:highCommunityMatch?'Strong community corroboration':mediumCommunityMatch&&strongClassification?'High-risk classification plus independent community reports':veryStrongClassification?'Very high-confidence scam classification':'Insufficient corroboration',
  };
}

export async function enqueueScamReportReview(ownerEmail:string,record:StoredEmailRecord,matches:SharedEvidenceMatch[]){
  const eligibility=shouldQueueForExternalReview(record,matches);
  if(!eligibility.eligible)return {queued:false,...eligibility};
  const rows=await supabaseRequest<ScamReportQueueItem[]>('scam_report_queue?on_conflict=user_email,email_record_id&select=*',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_email:ownerEmail,email_record_id:record.id,sender_email:record.senderEmail,sender_domain:domainOf(record.senderEmail)||null,subject:record.subject,category:record.category,risk_score:record.riskScore,confidence_score:record.confidenceScore,shared_evidence_count:eligibility.sharedEvidenceCount,independent_reporters:eligibility.independentReporters,status:'pending_review'})});
  return {queued:true,item:rows[0],...eligibility};
}

export async function listScamReportQueue(ownerEmail:string,limit=100){const safe=Math.max(1,Math.min(250,limit));return supabaseRequest<ScamReportQueueItem[]>(`scam_report_queue?user_email=eq.${encodeURIComponent(ownerEmail)}&select=id,email_record_id,sender_email,sender_domain,subject,category,risk_score,confidence_score,shared_evidence_count,independent_reporters,status,destination,created_at,reviewed_at,submitted_at&order=created_at.desc&limit=${safe}`);}

export async function updateScamReportQueueItem(ownerEmail:string,id:string,status:'approved'|'dismissed'|'submitted',destination?:string|null){const now=new Date().toISOString();const body:Record<string,unknown>={status,reviewed_at:now};if(destination!==undefined)body.destination=destination;if(status==='submitted')body.submitted_at=now;const rows=await supabaseRequest<ScamReportQueueItem[]>(`scam_report_queue?user_email=eq.${encodeURIComponent(ownerEmail)}&id=eq.${encodeURIComponent(id)}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});return rows[0]||null;}
