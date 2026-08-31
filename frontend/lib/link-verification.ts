import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { isKnownTrackingInfrastructure } from './link-purpose';
import type { LinkVerificationResult } from './types';

const MAX_LINKS = 8;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 4000;

function normalizeHost(host: string) {
  return host.toLowerCase().trim().replace(/^www\./, '').replace(/\.$/, '').split(':')[0];
}

function rootDomain(host: string) {
  const clean = normalizeHost(host);
  const parts = clean.split('.').filter(Boolean);
  if (parts.length <= 2) return clean;
  const twoPartTlds = new Set(['co.uk','org.uk','gov.uk','ac.uk','com.au','net.au','org.au','co.nz']);
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.has(lastTwo) && parts.length >= 3) return parts.slice(-3).join('.');
  return lastTwo;
}

function senderDomain(senderEmail: string) {
  return normalizeHost((senderEmail.split('@')[1] || '').trim());
}

function isPrivateIpv4(ip: string) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  return p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || p[0] === 0;
}

function isPrivateIpv6(ip: string) {
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:');
}

function isPrivateIp(ip: string) {
  const kind = isIP(ip);
  return kind === 4 ? isPrivateIpv4(ip) : kind === 6 ? isPrivateIpv6(ip) : false;
}

async function assertPublicHost(hostname: string) {
  const host = normalizeHost(hostname);
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('private-host');
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error('private-host');
    return;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('dns-unresolved');
  if (addresses.some(item => isPrivateIp(item.address))) throw new Error('private-host');
}

async function fetchOneHop(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('unsupported-scheme');
  if (parsed.username || parsed.password) throw new Error('embedded-credentials');
  await assertPublicHost(parsed.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let response = await fetch(parsed.toString(), {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'InboxOutlaw-LinkVerifier/1.0' },
    });
    const needsGet = [405, 501].includes(response.status) || (isKnownTrackingInfrastructure(parsed.toString()) && response.status >= 200 && response.status < 300);
    if (needsGet) {
      response = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'User-Agent': 'InboxOutlaw-LinkVerifier/1.0', Range: 'bytes=0-0' },
      });
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function invalidResult(originalUrl: string, reason: string): LinkVerificationResult {
  return {
    original_url: originalUrl,
    final_url: null,
    status: 'invalid',
    http_status: null,
    redirect_chain: [],
    redirect_count: 0,
    original_host: null,
    final_host: null,
    sender_aligned: null,
    cross_domain_redirect: false,
    https_final: null,
    reason,
  };
}

export async function verifyLinkDestination(originalUrl: string, senderEmail: string): Promise<LinkVerificationResult> {
  let current: URL;
  try {
    current = new URL(originalUrl);
    if (!['http:', 'https:'].includes(current.protocol)) return invalidResult(originalUrl, 'Only HTTP and HTTPS links can be verified.');
    if (current.username || current.password) return invalidResult(originalUrl, 'Link contains embedded credentials and was not opened.');
  } catch {
    return invalidResult(originalUrl, 'Link is not a valid URL.');
  }

  const originalHost = normalizeHost(current.hostname);
  const senderHost = senderDomain(senderEmail);
  const chain = [current.toString()];
  let httpStatus: number | null = null;

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      const response = await fetchOneHop(current.toString());
      httpStatus = response.status;
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;
        if (redirectCount === MAX_REDIRECTS) {
          return {
            original_url: originalUrl,
            final_url: current.toString(),
            status: 'unreachable',
            http_status: httpStatus,
            redirect_chain: chain,
            redirect_count: chain.length - 1,
            original_host: originalHost,
            final_host: normalizeHost(current.hostname),
            sender_aligned: senderHost ? rootDomain(current.hostname) === rootDomain(senderHost) : null,
            cross_domain_redirect: chain.some(item => rootDomain(new URL(item).hostname) !== rootDomain(originalHost)),
            https_final: current.protocol === 'https:',
            reason: 'Redirect chain exceeded the verification limit.',
          };
        }
        current = new URL(location, current);
        chain.push(current.toString());
        continue;
      }
      break;
    }

    const finalHost = normalizeHost(current.hostname);
    return {
      original_url: originalUrl,
      final_url: current.toString(),
      status: 'resolved',
      http_status: httpStatus,
      redirect_chain: chain,
      redirect_count: chain.length - 1,
      original_host: originalHost,
      final_host: finalHost,
      sender_aligned: senderHost ? rootDomain(finalHost) === rootDomain(senderHost) : null,
      cross_domain_redirect: rootDomain(finalHost) !== rootDomain(originalHost),
      https_final: current.protocol === 'https:',
      reason: chain.length > 1 ? 'Destination and redirect chain were resolved.' : 'Destination responded without a redirect.',
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'verification-failed';
    const blocked = code === 'private-host' || code === 'embedded-credentials' || code === 'unsupported-scheme';
    return {
      original_url: originalUrl,
      final_url: current.toString(),
      status: blocked ? 'blocked' : 'unreachable',
      http_status: httpStatus,
      redirect_chain: chain,
      redirect_count: chain.length - 1,
      original_host: originalHost,
      final_host: normalizeHost(current.hostname),
      sender_aligned: senderHost ? rootDomain(current.hostname) === rootDomain(senderHost) : null,
      cross_domain_redirect: rootDomain(current.hostname) !== rootDomain(originalHost),
      https_final: current.protocol === 'https:',
      reason: blocked ? 'Link points to a private, local, unsupported, or credential-bearing destination and was not opened.' : 'Destination could not be confirmed from the verification service. This is not proof that the link is unsafe.',
    };
  }
}

export async function verifyEmailLinks(links: string[], senderEmail: string): Promise<LinkVerificationResult[]> {
  const unique = Array.from(new Set(links.map(link => link.trim()).filter(Boolean))).slice(0, MAX_LINKS);
  return Promise.all(unique.map(link => verifyLinkDestination(link, senderEmail)));
}
