import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { fetchGmailMessageById } from '../../../../lib/gmail-local';
import { upsertSyncedEmailRecords } from '../../../../lib/email-records';
import { verifyEmailLinks } from '../../../../lib/link-verification';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

export async function POST(request:Request){
  let user;
  try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Your Inbox Outlaw session expired. Log in again.',stage:'session'},{status:401});}
  const payload=await request.json().catch(()=>null) as {gmailMessageId?:string}|null;
  const gmailMessageId=payload?.gmailMessageId?.trim();
  if(!gmailMessageId)return NextResponse.json({error:'A Gmail message ID is required.',stage:'input'},{status:400});

  let stage='gmail_fetch';
  try{
    const message=await fetchGmailMessageById(gmailMessageId);
    stage='link_verification';
    message.email.link_verifications=await verifyEmailLinks(message.email.links||[],message.email.sender_email);
    stage='record_update';
    const saved=await upsertSyncedEmailRecords(user.email,[message]);
    const record=saved[0];
    if(!record)throw new Error('The message could not be saved after reclassification.');
    return NextResponse.json({record,reclassifiedAt:new Date().toISOString(),linkVerification:'completed'},{headers:{'Cache-Control':'no-store, no-cache, must-revalidate'}});
  }catch(error){
    const technicalMessage=error instanceof Error?error.message:'Unable to reclassify this message.';
    console.error('[Inbox Outlaw reclassify failed]',{stage,gmailMessageId,technicalMessage});
    const authFailure=/401|403|oauth|token|refresh|invalid_grant|not connected|authorization/i.test(technicalMessage);
    const publicMessage=authFailure
      ? 'Gmail authorization needs to be refreshed before this message can be rechecked. Reconnect Gmail, then try again.'
      : stage==='gmail_fetch'
        ? 'Inbox Outlaw could not retrieve the original Gmail message for rechecking.'
        : stage==='link_verification'
          ? 'Inbox Outlaw retrieved the message but could not complete destination verification.'
          : 'Inbox Outlaw completed the message check but could not save the updated classification.';
    return NextResponse.json({error:publicMessage,stage,technicalMessage,needsReconnect:authFailure},{status:authFailure?409:502,headers:{'Cache-Control':'no-store'}});
  }
}
