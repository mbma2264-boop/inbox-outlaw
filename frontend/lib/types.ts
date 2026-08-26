export type SharedEvidenceMatch = {
  evidence_type: 'sender_domain' | 'reply_domain' | 'link_domain' | 'wallet' | 'phone';
  evidence_value: string;
  independent_reporters: number;
  total_reports: number;
  confidence_level: 'low' | 'medium' | 'high';
};

export type ClassificationRuleMatch = { rule_id: string; weight: number; reason: string };
export type LinkVerificationStatus = 'resolved' | 'unreachable' | 'blocked' | 'invalid';
export type LinkVerificationResult = { original_url:string; final_url:string|null; status:LinkVerificationStatus; http_status:number|null; redirect_chain:string[]; redirect_count:number; original_host:string|null; final_host:string|null; sender_aligned:boolean|null; cross_domain_redirect:boolean; https_final:boolean|null; reason:string; };
export type SenderVerificationLevel = 'Verified Brand'|'Authenticated Domain'|'Trusted Sender'|'Unverified Sender'|'Sender Mismatch';
export type SenderVerification = { level:SenderVerificationLevel; sender_domain:string; authenticated:boolean; brand_verified:boolean; reply_aligned:boolean|null; return_path_aligned:boolean|null; evidence:string[]; };
export type PersonalProofContext={count:number;payouts:number;purchases:number;identity:number;latest_summary?:string|null;};
export type MessageType = 'Sweepstakes / Promotion' | 'Purchase / Receipt' | 'Money / Payment' | 'Opportunity' | 'Account Alert' | 'Newsletter / Promotion' | 'Personal' | 'Business' | 'Unknown';
export type TrustLevel = 'Verified' | 'Trusted' | 'Unverified' | 'Suspicious' | 'High Risk';
export type MoneySignal = 'commission'|'payout'|'payment'|'refund'|'rebate'|'cashback'|'royalty'|'earnings'|'deposit'|'withdrawal'|'invoice'|'prize'|'grant'|'compensation'|'inheritance'|'unknown';
export type OpportunitySignal = 'affiliate'|'partnership'|'collaboration'|'sponsorship'|'referral'|'client'|'job'|'contract'|'lead'|'sale'|'commission'|'unknown';
export type EmailInput = { sender_name?:string|null; sender_email:string; subject:string; body_text:string; links:string[]; link_verifications?:LinkVerificationResult[]|null; known_contact:boolean; in_reply_thread:boolean; starred:boolean; reply_to?:string|null; return_path?:string|null; authentication_results?:string|null; sender_history_decision?:'safe'|'blocked'|null; domain_history?:{safe:number;scam:number;total:number}|null; community_evidence?:SharedEvidenceMatch[]|null; personal_proof?:PersonalProofContext|null; };
export type ClassificationResult = { category:string; message_type:MessageType; trust_level:TrustLevel; risk_score:number; confidence_score:number; reasons:string[]; matched_rules:ClassificationRuleMatch[]; recommended_action:string; used_llm:boolean; money_signal?:MoneySignal|null; opportunity_signal?:OpportunitySignal|null; sender_verification?:SenderVerification|null; };
export type ReviewState = 'safe'|'scam'|'opportunity'|null;
export type StoredEmailRecord = { id:string; gmailMessageId:string|null; threadId:string|null; source:string; senderName:string|null; senderEmail:string; subject:string; bodyText:string; category:string; messageType:MessageType|null; trustLevel:TrustLevel|null; riskScore:number; confidenceScore:number; classificationReasons:string[]; matchedRules:ClassificationRuleMatch[]; recommendedAction:string|null; reviewState:ReviewState; reviewedAt:string|null; receivedAt:string|null; createdAt:string; updatedAt:string; };
export type InboxSummary = { total:number; scams:number; opportunities:number; money:number; verifiedOpportunities:number; verifiedMoney:number; handled:number };
export type GmailStatus = { connected:boolean; has_refresh_token:boolean; scopes:string[]; token_expiry?:string|null; note:string };
export type GmailSyncMessage = { gmail_message_id:string; thread_id?:string|null; email:EmailInput; classification:ClassificationResult; received_at?:string|null; source:string };
export type ActivityLogEntry = { id:string; type:'login'|'manual_classification'|'gmail_connected'|'gmail_disconnected'|'gmail_synced'|'email_reviewed'|'sender_rule_updated'|'logout'; message:string; metadata:Record<string,unknown>|null; createdAt:string; };
