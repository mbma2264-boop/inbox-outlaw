import type { StoredEmailRecord } from './types';

export type CleanupDecision = {
  eligible: boolean;
  bucket: 'keep'|'review'|'spam_cleanup'|'scam_quarantine';
  confidence: number;
  reasons: string[];
};

const IMPORTANT_TYPES = new Set(['Money / Payment','Opportunity','Purchase / Receipt','Account Alert','Personal','Business']);
const IMPORTANT_TEXT = /commission|payout|payment|refund|rebate|cashback|royalt|earnings|deposit|withdrawal|invoice|receipt|order|purchase|account|security|password|verification|appointment|reservation|booking|interview|job|contract|client|lead|sale|affiliate|partnership|collaboration|sponsorship|referral/i;
const BULK_TEXT = /unsubscribe|manage preferences|email preferences|view in browser|promotional email|newsletter|daily digest|weekly digest|special offer|sale ends|limited time offer/i;

export function evaluateCleanup(record: StoredEmailRecord): CleanupDecision {
  const reasons:string[]=[];
  const type=record.messageType||'Unknown';
  const text=`${record.subject}\n${record.bodyText}`;

  // Never auto-clear anything the user has explicitly protected or anything carrying important signals.
  if(record.reviewState==='safe'||record.reviewState==='opportunity') return {eligible:false,bucket:'keep',confidence:100,reasons:['User review protects this message from cleanup.']};
  if(IMPORTANT_TYPES.has(type)||IMPORTANT_TEXT.test(text)) return {eligible:false,bucket:'keep',confidence:95,reasons:['Important, transactional, financial, account, personal, or opportunity signal detected.']};

  // Confirmed/high-risk scams are quarantined, not silently deleted, so evidence can be preserved/reporting can happen first.
  if(record.reviewState==='scam'||record.trustLevel==='High Risk'||record.category==='Scam'||record.category==='Likely Scam') return {eligible:false,bucket:'scam_quarantine',confidence:Math.max(85,record.confidenceScore),reasons:['Threat evidence should be preserved before report/block/delete actions.']};

  // Uncertain mail is never cleanup eligible.
  if(record.trustLevel==='Unverified'||record.trustLevel==='Suspicious'||record.confidenceScore<85) return {eligible:false,bucket:'review',confidence:record.confidenceScore,reasons:['Inbox Outlaw is not confident enough to clear this message.']};

  // Only high-confidence bulk/promotional mail with no protected signals reaches cleanup.
  const bulk=type==='Newsletter / Promotion'||type==='Sweepstakes / Promotion'||record.category==='Promotion'||BULK_TEXT.test(text);
  if(bulk&&(record.trustLevel==='Verified'||record.trustLevel==='Trusted')&&record.confidenceScore>=90){
    reasons.push('High-confidence bulk/promotional message.');
    reasons.push('No protected money, opportunity, transaction, account, personal, or business signal detected.');
    return {eligible:true,bucket:'spam_cleanup',confidence:record.confidenceScore,reasons};
  }

  return {eligible:false,bucket:'review',confidence:record.confidenceScore,reasons:['Message does not meet the strict safe-cleanup threshold.']};
}
