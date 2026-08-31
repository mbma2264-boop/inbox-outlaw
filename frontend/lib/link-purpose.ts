import type { LinkVerificationResult } from './types';

export type LinkPurpose = 'account/login'|'payment'|'prize/claim'|'unsubscribe/preferences'|'tracking'|'informational'|'unknown';

function text(value:string|null|undefined){return String(value||'').toLowerCase();}

export function classifyLinkPurpose(link:string, verification?:LinkVerificationResult|null):LinkPurpose{
  const combined=`${text(link)} ${text(verification?.final_url)}`;
  if(/unsubscribe|preference[_\-/ ]?center|manage[_\-/ ]?(preferences|subscription)|opt[_\-/ ]?out/.test(combined))return 'unsubscribe/preferences';
  if(/login|log-in|signin|sign-in|verify[_\-/ ]?account|password|security[_\-/ ]?code|one[_\-/ ]?time/.test(combined))return 'account/login';
  if(/checkout|payment|billing|invoice|pay[_\-/ ]?now|wallet/.test(combined))return 'payment';
  if(/sweep|prize|claim|winner|contest|giveaway/.test(combined))return 'prize/claim';
  if(/\/track|tracking|click[_\-/ ]?track|redirect|pixel|open[_\-/ ]?track/.test(combined))return 'tracking';
  try{const url=new URL(verification?.final_url||link);if(/^https?:$/.test(url.protocol)&&url.pathname&&url.pathname!=='/')return 'informational';}catch{}
  return 'unknown';
}

export function isAdministrativePurpose(purpose:LinkPurpose){return purpose==='unsubscribe/preferences'||purpose==='tracking';}

export function isSensitivePurpose(purpose:LinkPurpose){return purpose==='account/login'||purpose==='payment'||purpose==='prize/claim';}
