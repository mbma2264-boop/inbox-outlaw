import { describe, expect, it } from 'vitest';
import { classifyLinkPurpose, isAdministrativePurpose, isSensitivePurpose } from './link-purpose';

describe('link purpose classification',()=>{
  it('separates a third-party preference center from primary action links',()=>{
    const purpose=classifyLinkPurpose('https://07.emailinboundprocessing.com/preference_center/v1/token');
    expect(purpose).toBe('unsubscribe/preferences');
    expect(isAdministrativePurpose(purpose)).toBe(true);
  });

  it('treats prize destinations as sensitive even when they use HTTPS',()=>{
    const purpose=classifyLinkPurpose('https://www.prizeloot.com/sweeps/pl_499k');
    expect(purpose).toBe('prize/claim');
    expect(isSensitivePurpose(purpose)).toBe(true);
  });

  it('treats login destinations as sensitive',()=>{
    expect(isSensitivePurpose(classifyLinkPurpose('https://example.com/account/login'))).toBe(true);
  });

  it('does not infer trust from an unknown HTTPS destination',()=>{
    expect(classifyLinkPurpose('https://unrelated.example/')).toBe('unknown');
  });
});
