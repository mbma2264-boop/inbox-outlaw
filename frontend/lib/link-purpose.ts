import type { LinkVerificationResult } from './types';

export type LinkPurpose = 'account/login'|'payment'|'prize/claim'|'unsubscribe/preferences'|'tracking'|'informational'|'unknown';

const TRACKING_PROVIDERS:[string,string][]=[
  ['aweber.com','AWeber'],
  ['clicks.aweber.com','AWeber'],
  ['mailchimp.com','Mailchimp'],
  ['list-manage.com','Mailchimp'],
  ['mandrillapp.com','Mailchimp/Mandrill'],
  ['constantcontact.com','Constant Contact'],
  ['r20.rs6.net','Constant Contact'],
  ['sendgrid.net','SendGrid'],
  ['hubspotlinks.com','HubSpot'],
  ['hubspotemail.net','HubSpot'],
  ['click.convertkit-mail.com','Kit'],
  ['convertkit-mail.com','Kit'],
  ['activehosted.com','ActiveCampaign'],
  ['mailgun.org','Mailgun'],
  ['mailgun.net','Mailgun'],
];

function text(value:string|null|undefined){return String(value||'').toLowerCase();}
function hostOf(value:string|null|undefined){try{return new URL(String(value||'')).hostname.toLowerCase().replace(/^www\./,'');}catch{return'';}}

export function trackingProvider(value:string|null|undefined):string|null{
  const host=hostOf(value);
  if(!host)return null;
  for(const [domain,provider] of TRACKING_PROVIDERS){
    if(host===domain||host.endsWith(`.${domain}`))return provider;
  }
  return null;
}

export function isKnownTrackingInfrastructure(value:string|null|undefined){return Boolean(trackingProvider(value));}

export function classifyLinkPurpose(link:string, verification?:LinkVerificationResult|null):LinkPurpose{
  const combined=`${text(link)} ${text(verification?.final_url)}`;
  if(/unsubscribe|preference[_\-/ ]?center|manage[_\-/ ]?(preferences|subscription)|opt[_\-/ ]?out/.test(combined))return 'unsubscribe/preferences';
  if(/login|log-in|signin|sign-in|verify[_\-/ ]?account|password|security[_\-/ ]?code|one[_\-/ ]?time/.test(combined))return 'account/login';
  if(/checkout|payment|billing|invoice|pay[_\-/ ]?now|wallet/.test(combined))return 'payment';
  if(/sweep|prize|claim|winner|contest|giveaway/.test(combined))return 'prize/claim';
  if(isKnownTrackingInfrastructure(link)||isKnownTrackingInfrastructure(verification?.final_url))return 'tracking';
  if(/\/track|tracking|click[_\-/ ]?track|redirect|pixel|open[_\-/ ]?track/.test(combined))return 'tracking';
  try{const url=new URL(verification?.final_url||link);if(/^https?:$/.test(url.protocol)&&url.pathname&&url.pathname!=='/')return 'informational';}catch{}
  return 'unknown';
}

export function isAdministrativePurpose(purpose:LinkPurpose){return purpose==='unsubscribe/preferences'||purpose==='tracking';}

export function isSensitivePurpose(purpose:LinkPurpose){return purpose==='account/login'||purpose==='payment'||purpose==='prize/claim';}
