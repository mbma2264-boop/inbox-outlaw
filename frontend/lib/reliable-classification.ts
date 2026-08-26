import { classifyEmailEvidence } from './classification-engine';
import type { ClassificationResult, EmailInput, MessageType, TrustLevel } from './types';

function fallbackCategory(type: MessageType) {
  if (type === 'Opportunity') return 'Opportunity';
  if (type === 'Newsletter / Promotion') return 'Promotion';
  if (type === 'Sweepstakes / Promotion') return 'Sweepstakes / Promotion';
  if (type === 'Personal') return 'Personal';
  return 'Needs Review';
}

function withReason(result: ClassificationResult, reason: string, ruleId: string, weight: number) {
  if (!result.reasons.includes(reason)) result.reasons = [reason, ...result.reasons];
  if (!result.matched_rules.some(rule => rule.rule_id === ruleId)) {
    result.matched_rules = [{ rule_id: ruleId, weight, reason }, ...result.matched_rules];
  }
}

function setTrust(result: ClassificationResult, trust: TrustLevel) {
  result.trust_level = trust;
  if (trust === 'Unverified' && result.category.startsWith('Verified ')) result.category = fallbackCategory(result.message_type);
}

export function classifyEmailReliably(email: EmailInput): ClassificationResult {
  const result = classifyEmailEvidence(email);
  const links = email.links || [];
  const checks = email.link_verifications || [];

  // Existing strong danger evidence remains authoritative. Link verification never turns a high-risk
  // message into a safe one, and a network failure is never treated as proof of fraud.
  if (!links.length) return result;

  if (!checks.length) {
    const reason = 'This message contains links, but their destinations have not yet been independently resolved.';
    withReason(result, reason, 'link_destination_unverified', 0);
    if (result.trust_level === 'Verified') {
      setTrust(result, 'Unverified');
      result.confidence_score = Math.min(result.confidence_score, 74);
      result.recommended_action = 'Verify the destination links before treating this message as verified. The subject line and visible link text are not proof of where a link goes.';
    }
    return result;
  }

  const blocked = checks.filter(check => check.status === 'blocked' || check.status === 'invalid');
  const unreachable = checks.filter(check => check.status === 'unreachable');
  const resolved = checks.filter(check => check.status === 'resolved');
  const misaligned = resolved.filter(check => check.sender_aligned === false);
  const insecure = resolved.filter(check => check.https_final === false);
  const allResolved = checks.length === links.length && resolved.length === checks.length;
  const allSenderAligned = allResolved && resolved.every(check => check.sender_aligned === true);

  if (blocked.length) {
    const reason = `${blocked.length} link${blocked.length === 1 ? '' : 's'} could not be safely opened because the destination was invalid, private/local, unsupported, or credential-bearing.`;
    withReason(result, reason, 'link_destination_blocked', 24);
    if (result.trust_level !== 'High Risk') {
      result.trust_level = 'Suspicious';
      result.category = result.message_type === 'Opportunity' ? 'Opportunity' : 'Needs Review';
      result.risk_score = Math.max(result.risk_score, 58);
      result.confidence_score = Math.max(result.confidence_score, 82);
      result.recommended_action = 'Do not use the blocked link. Verify the sender and destination independently before acting.';
    }
    return result;
  }

  if (unreachable.length) {
    const reason = `${unreachable.length} link destination${unreachable.length === 1 ? ' was' : 's were'} not reachable by the verification service. This is not proof that the link is unsafe.`;
    withReason(result, reason, 'link_destination_unreachable', 0);
    if (result.trust_level === 'Verified') {
      setTrust(result, 'Unverified');
      result.confidence_score = Math.min(result.confidence_score, 74);
      result.recommended_action = 'The message cannot be called verified until its link destinations can be resolved. Use the organization’s official app or a bookmarked site if action is required.';
    }
    return result;
  }

  if (misaligned.length) {
    const credentialLanguage = /password|verification code|security code|one-time code|login now|verify your account|confirm your account/i.test(email.body_text || '');
    const reason = `${misaligned.length} resolved link destination${misaligned.length === 1 ? ' does' : 's do'} not align with the authenticated sender domain.`;
    withReason(result, reason, 'resolved_link_sender_mismatch', credentialLanguage ? 24 : 8);
    if (result.trust_level === 'Verified') setTrust(result, credentialLanguage ? 'Suspicious' : 'Unverified');
    if (credentialLanguage && result.trust_level !== 'High Risk') {
      result.trust_level = 'Suspicious';
      result.category = result.message_type === 'Opportunity' ? 'Opportunity' : 'Needs Review';
      result.risk_score = Math.max(result.risk_score, 60);
      result.confidence_score = Math.max(result.confidence_score, 86);
      result.recommended_action = 'A resolved link asks for account action but ends on a domain unrelated to the authenticated sender. Do not use that link; open the organization’s official site or app independently.';
    } else if (result.trust_level === 'Unverified') {
      result.confidence_score = Math.min(result.confidence_score, 78);
      result.recommended_action = 'The destination was resolved, but it does not match the authenticated sender domain. This can be legitimate tracking, but it must not be presented as verified without additional evidence.';
    }
    return result;
  }

  if (insecure.length && result.trust_level === 'Verified') {
    const reason = 'At least one resolved destination uses unencrypted HTTP rather than HTTPS.';
    withReason(result, reason, 'resolved_link_insecure_http', 5);
    setTrust(result, 'Unverified');
    result.confidence_score = Math.min(result.confidence_score, 78);
    result.recommended_action = 'The destination resolved but does not use HTTPS. Verify the organization independently before entering information or making a payment.';
    return result;
  }

  if (allSenderAligned) {
    const redirects = resolved.reduce((sum, check) => sum + check.redirect_count, 0);
    const reason = redirects
      ? `All ${resolved.length} checked link destination${resolved.length === 1 ? '' : 's'} resolved through the redirect chain and ended on the authenticated sender domain.`
      : `All ${resolved.length} checked link destination${resolved.length === 1 ? '' : 's'} resolved on the authenticated sender domain.`;
    withReason(result, reason, 'resolved_links_sender_aligned', -10);
    result.confidence_score = Math.min(98, result.confidence_score + 4);
  }

  return result;
}
