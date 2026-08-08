import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../lib/auth';
import { prepareScamReportPackage } from '../../../lib/scam-report-package';

export async function GET(request:Request){
  let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
  const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({error:'A queue id is required.'},{status:400});
  try{return NextResponse.json({package:await prepareScamReportPackage(user.email,id)},{headers:{'Cache-Control':'no-store'}});}catch(error){const message=error instanceof Error?error.message:'Unable to prepare report package.';const status=/must be approved/i.test(message)?409:/not found/i.test(message)?404:500;return NextResponse.json({error:message},{status});}
}
