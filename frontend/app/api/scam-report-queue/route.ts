import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../lib/auth';
import { listScamReportQueue, updateScamReportQueueItem } from '../../../lib/scam-report-queue';

export async function GET(){
  let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
  try{return NextResponse.json({items:await listScamReportQueue(user.email,150)},{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load report queue.'},{status:500});}
}

export async function PATCH(request:Request){
  let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
  let body:{id?:string;status?:'approved'|'dismissed'|'submitted';destination?:string|null;confirmExternalSubmission?:boolean};try{body=await request.json() as typeof body;}catch{return NextResponse.json({error:'Invalid JSON payload.'},{status:400});}
  if(!body.id||!body.status||!['approved','dismissed','submitted'].includes(body.status))return NextResponse.json({error:'A queue id and valid status are required.'},{status:400});
  if(body.status==='submitted'&&body.confirmExternalSubmission!==true)return NextResponse.json({error:'Explicit confirmation is required before recording an external submission.'},{status:400});
  if(body.status==='submitted'&&!body.destination)return NextResponse.json({error:'A reporting destination is required when marking a case submitted.'},{status:400});
  const item=await updateScamReportQueueItem(user.email,body.id,body.status,body.destination??null);if(!item)return NextResponse.json({error:'Queue item not found.'},{status:404});
  const note=body.status==='approved'?'Approved for report preparation. No external report has been sent.':body.status==='dismissed'?'Dismissed from the external-report review queue.':`Recorded as externally submitted to ${body.destination}. Inbox Outlaw did not send the report itself.`;
  return NextResponse.json({item,note});
}
