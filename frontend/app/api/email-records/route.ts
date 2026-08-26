import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../lib/activity-log';
import { requireSessionUser } from '../../../lib/auth';
import { createEmailRecord, getInboxSummary, listEmailRecords, updateEmailReview, updateSenderReview } from '../../../lib/email-records';
import { verifyEmailLinks } from '../../../lib/link-verification';
import { classifyEmailReliably } from '../../../lib/reliable-classification';
import { contributeScamEvidence, findSharedEvidenceMatches } from '../../../lib/shared-scam-evidence';
import { enqueueScamReportReview } from '../../../lib/scam-report-queue';
import type { ClassificationResult, EmailInput, ReviewState, StoredEmailRecord } from '../../../lib/types';

function validateEmailPayload(payload:Partial<EmailInput>):payload is EmailInput{return Boolean(payload.sender_email&&payload.subject&&payload.body_text&&Array.isArray(payload.links)&&typeof payload.known_contact==='boolean'&&typeof payload.in_reply_thread==='boolean'&&typeof payload.starred==='boolean');}
function stateLabel(state:ReviewState){if(state==='safe')return'safe';if(state==='scam')return'scam';if(state==='opportunity')return'opportunity';return'cleared';}
function evidenceInput(record:StoredEmailRecord):EmailInput{return{sender_email:record.senderEmail,sender_name:record.senderName,subject:record.subject,body_text:record.bodyText,links:(record.bodyText.match(/https?:\/\/[^\s<>"')\]]+/gi)||[]).slice(0,20),known_contact:false,in_reply_thread:false,starred:false};}
async function contributeAndQueue(userEmail:string,record:StoredEmailRecord){let evidenceContributed=0;try{evidenceContributed=await contributeScamEvidence(userEmail,record);}catch{}let reportQueue=null;try{const matches=await findSharedEvidenceMatches(evidenceInput(record));reportQueue=await enqueueScamReportReview(userEmail,record,matches);}catch{}return{evidenceContributed,reportQueue};}

export async function GET(){let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}try{const[records,summary]=await Promise.all([listEmailRecords(user.email,100),getInboxSummary(user.email)]);return NextResponse.json({records,summary,sessionUser:user},{headers:{'Cache-Control':'no-store'}});}catch(error){console.error('Dashboard record store unavailable',error);return NextResponse.json({records:[],summary:{total:0,scams:0,opportunities:0,handled:0},sessionUser:user,warning:'Saved email storage is temporarily unavailable. Gmail connection and classification can still be repaired independently.'},{headers:{'Cache-Control':'no-store','X-Inbox-Outlaw-Degraded':'record-store'}});}}

export async function POST(request:Request){let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}let payload:Partial<EmailInput>;try{payload=await request.json() as Partial<EmailInput>;}catch{return NextResponse.json({error:'Invalid JSON payload.'},{status:400});}if(!validateEmailPayload(payload))return NextResponse.json({error:'Missing required email fields.'},{status:400});const verifiedPayload:EmailInput={...payload,link_verifications:await verifyEmailLinks(payload.links,payload.sender_email)};const preliminary=classifyEmailReliably(verifiedPayload);const record=await createEmailRecord(user.email,verifiedPayload,preliminary);const result:ClassificationResult={category:record.category,message_type:record.messageType??preliminary.message_type,trust_level:record.trustLevel??preliminary.trust_level,risk_score:record.riskScore,confidence_score:record.confidenceScore,reasons:record.classificationReasons,matched_rules:record.matchedRules,recommended_action:record.recommendedAction??preliminary.recommended_action,used_llm:false};await addActivityLog(user.email,'manual_classification',`Saved manual classification for ${payload.subject}.`,{category:result.category,riskScore:result.risk_score,linkVerification:'completed'});return NextResponse.json({result,record},{status:201});}

export async function PATCH(request:Request){
 let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
 let payload:{id?:string;senderEmail?:string;reviewState?:ReviewState;applyToSender?:boolean};try{payload=await request.json() as typeof payload;}catch{return NextResponse.json({error:'Invalid JSON payload.'},{status:400});}
 const allowed:ReviewState[]=['safe','scam','opportunity',null];const state=payload.reviewState??null;if(!allowed.includes(state))return NextResponse.json({error:'A valid review state is required.'},{status:400});
 if(payload.applyToSender){
   if(!payload.senderEmail||(state!=='safe'&&state!=='scam'&&state!==null))return NextResponse.json({error:'A sender email and safe, scam, or cleared state are required.'},{status:400});
   const records=await updateSenderReview(user.email,payload.senderEmail,state);if(!records.length)return NextResponse.json({error:'No records found for that sender.'},{status:404});
   let evidenceContributed=0;let queuedForReview=0;if(state==='scam'){for(const record of records.slice(0,25)){const result=await contributeAndQueue(user.email,record);evidenceContributed+=result.evidenceContributed;if(result.reportQueue?.queued)queuedForReview+=1;}}
   const summary=await getInboxSummary(user.email);await addActivityLog(user.email,'sender_rule_updated',state===null?`Removed the saved sender decision for ${payload.senderEmail}.`:`Marked ${payload.senderEmail} as ${state==='safe'?'a safe sender':'a blocked sender'}.`,{senderEmail:payload.senderEmail,reviewState:state,affectedRecords:records.length,evidenceContributed,queuedForReview});
   return NextResponse.json({records,record:records[0],summary,evidenceContributed,queuedForReview});
 }
 if(!payload.id)return NextResponse.json({error:'A valid record id is required.'},{status:400});
 const record=await updateEmailReview(user.email,payload.id,state);if(!record)return NextResponse.json({error:'Email record not found.'},{status:404});
 let evidenceContributed=0;let reportQueue=null;if(state==='scam'){const result=await contributeAndQueue(user.email,record);evidenceContributed=result.evidenceContributed;reportQueue=result.reportQueue;}
 const summary=await getInboxSummary(user.email);await addActivityLog(user.email,'email_reviewed',state===null?`Cleared the saved decision for “${record.subject}”.`:`Marked “${record.subject}” as ${stateLabel(state)}.`,{recordId:record.id,senderEmail:record.senderEmail,reviewState:state,category:record.category,evidenceContributed,queuedForReview:Boolean(reportQueue?.queued)});
 return NextResponse.json({record,summary,evidenceContributed,reportQueue});
}
