export interface PublicMonetizationLinks {
  newsletterUrl: string;
  supportUrl: string;
}

function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

/**
 * Optional website-only destinations. Keeping these deployment-configured
 * avoids collecting email or payment data before a provider is selected.
 */
export function getPublicMonetizationLinks(): PublicMonetizationLinks {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    newsletterUrl: safeHttpUrl(env.VITE_NEWSLETTER_URL),
    supportUrl: safeHttpUrl(env.VITE_SUPPORT_URL),
  };
}
