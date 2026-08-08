import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../lib/auth';
import { listScamReportQueue, updateScamReportQueueItem } from '../../../lib/scam-report-queue';

export async function GET(){
  let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
  try{return NextResponse.json({items:await listScamReportQueue(user.email,150)},{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load report queue.'},{status:500});}
}

export async function PATCH(request:Request){
  let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
  let body:{id?:string;status?:'approved'|'dismissed';destination?:string|null};try{body=await request.json() as typeof body;}catch{return NextResponse.json({error:'Invalid JSON payload.'},{status:400});}
  if(!body.id||!body.status||!['approved','dismissed'].includes(body.status))return NextResponse.json({error:'A queue id and approved or dismissed status are required.'},{status:400});
  const item=await updateScamReportQueueItem(user.email,body.id,body.status,body.destination??null);if(!item)return NextResponse.json({error:'Queue item not found.'},{status:404});
  return NextResponse.json({item,note:body.status==='approved'?'Approved for report preparation. No external report has been sent.':'Dismissed from the external-report review queue.'});
}
