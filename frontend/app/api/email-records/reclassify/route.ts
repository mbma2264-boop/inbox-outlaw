import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { fetchGmailMessageById } from '../../../../lib/gmail-local';
import { getInboxSummary, listEmailRecords, upsertSyncedEmailRecords } from '../../../../lib/email-records';
import { verifyEmailLinks } from '../../../../lib/link-verification';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

async function reclassifyOne(owner:string,gmailMessageId:string){
  const message=await fetchGmailMessageById(gmailMessageId);
  message.email.link_verifications=await verifyEmailLinks(message.email.links||[],message.email.sender_email);
  const saved=await upsertSyncedEmailRecords(owner,[message]);
  const record=saved[0];
  if(!record)throw new Error('The message could not be saved after reclassification.');
  return record;
}

export async function POST(request:Request){
  let user;
  try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Your Inbox Outlaw session expired. Log in again.',stage:'session'},{status:401});}
  const payload=await request.json().catch(()=>null) as {gmailMessageId?:string;batch?:boolean;limit?:number}|null;

  if(payload?.batch){
    const limit=Math.max(1,Math.min(250,Number(payload.limit??100)));
    const records=await listEmailRecords(user.email,limit);
    const candidates=records.filter(record=>Boolean(record.gmailMessageId));
    let updated=0;
    const failures:{gmailMessageId:string;error:string}[]=[];
    for(const record of candidates){
      try{await reclassifyOne(user.email,record.gmailMessageId!);updated++;}
      catch(error){failures.push({gmailMessageId:record.gmailMessageId!,error:error instanceof Error?error.message:'Unable to reclassify message.'});}
    }
    const summary=await getInboxSummary(user.email);
    return NextResponse.json({mode:'batch',requested:candidates.length,updated,failed:failures.length,failures:failures.slice(0,20),summary,reclassifiedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store, no-cache, must-revalidate'}});
  }

  const gmailMessageId=payload?.gmailMessageId?.trim();
  if(!gmailMessageId)return NextResponse.json({error:'A Gmail message ID is required.',stage:'input'},{status:400});
  let stage='gmail_fetch';
  try{
    const record=await reclassifyOne(user.email,gmailMessageId);
    stage='record_update';
    return NextResponse.json({record,reclassifiedAt:new Date().toISOString(),linkVerification:'completed'},{headers:{'Cache-Control':'no-store, no-cache, must-revalidate'}});
  }catch(error){
    const technicalMessage=error instanceof Error?error.message:'Unable to reclassify this message.';
    console.error('[Inbox Outlaw reclassify failed]',{stage,gmailMessageId,technicalMessage});
    const authFailure=/401|403|oauth|token|refresh|invalid_grant|not connected|authorization/i.test(technicalMessage);
    const publicMessage=authFailure?'Gmail authorization needs to be refreshed before this message can be rechecked. Reconnect Gmail, then try again.':'Inbox Outlaw could not retrieve, verify, or save the original Gmail message for rechecking.';
    return NextResponse.json({error:publicMessage,stage,technicalMessage,needsReconnect:authFailure},{status:authFailure?409:502,headers:{'Cache-Control':'no-store'}});
  }
}
