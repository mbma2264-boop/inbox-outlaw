import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { fetchGmailMessageById } from '../../../../lib/gmail-local';
import { upsertSyncedEmailRecords } from '../../../../lib/email-records';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

export async function POST(request:Request){
  let user;
  try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Your Inbox Outlaw session expired. Log in again.'},{status:401});}
  const payload=await request.json().catch(()=>null) as {gmailMessageId?:string}|null;
  const gmailMessageId=payload?.gmailMessageId?.trim();
  if(!gmailMessageId)return NextResponse.json({error:'A Gmail message ID is required.'},{status:400});
  try{
    const message=await fetchGmailMessageById(gmailMessageId);
    const saved=await upsertSyncedEmailRecords(user.email,[message]);
    const record=saved[0];
    if(!record)return NextResponse.json({error:'The message could not be reclassified.'},{status:500});
    return NextResponse.json({record,reclassifiedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store, no-cache, must-revalidate'}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to reclassify this message.'},{status:502});
  }
}
