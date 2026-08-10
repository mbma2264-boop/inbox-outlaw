export type BrandIdentityMatch = {
  brand: string;
  senderDomain: string;
  officialDomains: string[];
  mismatch: boolean;
};

type BrandIdentity = {
  brand: string;
  aliases: string[];
  officialDomains: string[];
};

const BRANDS: BrandIdentity[] = [
  { brand: 'UPS', aliases: ['ups', 'united parcel service'], officialDomains: ['ups.com'] },
  { brand: 'FedEx', aliases: ['fedex', 'federal express'], officialDomains: ['fedex.com'] },
  { brand: 'USPS', aliases: ['usps', 'united states postal service'], officialDomains: ['usps.com'] },
  { brand: 'Google', aliases: ['google', 'google one', 'gmail'], officialDomains: ['google.com', 'gmail.com'] },
  { brand: 'Amazon', aliases: ['amazon'], officialDomains: ['amazon.com'] },
  { brand: 'PayPal', aliases: ['paypal'], officialDomains: ['paypal.com'] },
  { brand: 'Apple', aliases: ['apple', 'icloud'], officialDomains: ['apple.com', 'icloud.com'] },
  { brand: 'Microsoft', aliases: ['microsoft', 'outlook'], officialDomains: ['microsoft.com', 'outlook.com'] },
  { brand: 'Netflix', aliases: ['netflix'], officialDomains: ['netflix.com'] },
  { brand: 'Venmo', aliases: ['venmo'], officialDomains: ['venmo.com'] },
  { brand: 'Cash App', aliases: ['cash app', 'cashapp'], officialDomains: ['cash.app', 'squareup.com'] },
  { brand: 'Coinbase', aliases: ['coinbase'], officialDomains: ['coinbase.com'] },
  { brand: 'Walmart', aliases: ['walmart'], officialDomains: ['walmart.com'] },
  { brand: 'Target', aliases: ['target'], officialDomains: ['target.com'] },
  { brand: 'Chase', aliases: ['chase', 'jpmorgan chase'], officialDomains: ['chase.com', 'jpmorgan.com'] },
  { brand: 'Bank of America', aliases: ['bank of america'], officialDomains: ['bankofamerica.com'] },
  { brand: 'Wells Fargo', aliases: ['wells fargo'], officialDomains: ['wellsfargo.com'] },
  { brand: 'Citi', aliases: ['citibank', 'citi bank'], officialDomains: ['citi.com'] },
  { brand: 'IRS', aliases: ['irs', 'internal revenue service'], officialDomains: ['irs.gov'] },
  { brand: 'Social Security Administration', aliases: ['social security administration'], officialDomains: ['ssa.gov'] },
];

function normalizeHost(value: string) {
  return value.toLowerCase().trim().replace(/^www\./, '').split(':')[0];
}

function rootDomain(value: string) {
  const host = normalizeHost(value);
  const parts = host.split('.').filter(Boolean);
  return parts.length <= 2 ? host : parts.slice(-2).join('.');
}

function normalizeWords(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasAlias(displayName: string, alias: string) {
  const name = ` ${normalizeWords(displayName)} `;
  const candidate = ` ${normalizeWords(alias)} `;
  return name.includes(candidate);
}

export function detectBrandIdentityMismatch(senderName: string | null | undefined, senderDomain: string): BrandIdentityMatch | null {
  const displayName = String(senderName || '').trim();
  if (!displayName || !senderDomain) return null;

  const brand = BRANDS.find(item => item.aliases.some(alias => hasAlias(displayName, alias)));
  if (!brand) return null;

  const senderRoot = rootDomain(senderDomain);
  const mismatch = !brand.officialDomains.some(domain => rootDomain(domain) === senderRoot);
  return { brand: brand.brand, senderDomain, officialDomains: brand.officialDomains, mismatch };
}
