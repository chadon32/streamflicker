export interface PublicMonetizationLinks {
  newsletterUrl: string;
  supportUrl: string;
  sponsorInquiryUrl: string;
}

export interface SponsorshipPlacement {
  name: string;
  headline: string;
  copy: string;
  url: string;
  ctaLabel: string;
  imageUrl: string;
}

export interface AdSenseConfig {
  enabled: boolean;
  clientId: string;
  homeSlot: string;
  resultsSlot: string;
}

export interface PublicMonetizationConfig extends PublicMonetizationLinks {
  sponsorship: SponsorshipPlacement | null;
  ads: AdSenseConfig;
}

export function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanAdSenseClientId(value: unknown): string {
  const candidate = cleanText(value, 32);
  return /^ca-pub-\d{16}$/.test(candidate) ? candidate : '';
}

function cleanAdSlot(value: unknown): string {
  const candidate = cleanText(value, 16);
  return /^\d{6,12}$/.test(candidate) ? candidate : '';
}

export function parsePublicMonetizationConfig(
  env: Record<string, string | undefined>,
): PublicMonetizationConfig {
  const sponsorName = cleanText(env.VITE_SPONSOR_NAME, 80);
  const sponsorHeadline = cleanText(env.VITE_SPONSOR_HEADLINE, 120);
  const sponsorUrl = safeHttpUrl(env.VITE_SPONSOR_URL);
  const clientId = cleanAdSenseClientId(env.VITE_ADSENSE_CLIENT_ID);
  const homeSlot = cleanAdSlot(env.VITE_ADSENSE_HOME_SLOT);
  const resultsSlot = cleanAdSlot(env.VITE_ADSENSE_RESULTS_SLOT);
  const adsEnabled = env.VITE_ADSENSE_ENABLED?.trim().toLowerCase() === 'true';

  return {
    newsletterUrl: safeHttpUrl(env.VITE_NEWSLETTER_URL),
    supportUrl: safeHttpUrl(env.VITE_SUPPORT_URL),
    sponsorInquiryUrl: safeHttpUrl(env.VITE_SPONSOR_INQUIRY_URL),
    sponsorship: sponsorName && sponsorHeadline && sponsorUrl
      ? {
          name: sponsorName,
          headline: sponsorHeadline,
          copy: cleanText(env.VITE_SPONSOR_COPY, 240),
          url: sponsorUrl,
          ctaLabel: cleanText(env.VITE_SPONSOR_CTA, 32) || 'Learn more',
          imageUrl: safeHttpUrl(env.VITE_SPONSOR_IMAGE_URL),
        }
      : null,
    ads: {
      enabled: Boolean(adsEnabled && clientId && (homeSlot || resultsSlot)),
      clientId,
      homeSlot,
      resultsSlot,
    },
  };
}

/**
 * Optional website-only destinations. Keeping these deployment-configured
 * avoids collecting email or payment data before a provider is selected.
 */
export function getPublicMonetizationConfig(): PublicMonetizationConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  return parsePublicMonetizationConfig(env);
}

export function getPublicMonetizationLinks(): PublicMonetizationLinks {
  const { newsletterUrl, supportUrl, sponsorInquiryUrl } = getPublicMonetizationConfig();
  return { newsletterUrl, supportUrl, sponsorInquiryUrl };
}
