export interface AffiliateConfig {
  amazonTag: string;
  appleAffiliateToken: string;
  impactSubId: string;
  ebayCampId: string;
}

export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  amazonTag: '',
  appleAffiliateToken: '',
  impactSubId: '',
  ebayCampId: '',
};

function cleanValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Read affiliate identifiers from deployment configuration. Local overrides
 * remain available only during desktop development, while production builds
 * ignore browser-local values so visitors cannot change attribution IDs.
 */
export function getAffiliateConfig(): AffiliateConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  const deploymentConfig: AffiliateConfig = {
    amazonTag: cleanValue(env.VITE_AFFILIATE_AMAZON_TAG),
    appleAffiliateToken: cleanValue(env.VITE_AFFILIATE_APPLE_TOKEN),
    impactSubId: cleanValue(env.VITE_AFFILIATE_IMPACT_SUB_ID),
    ebayCampId: cleanValue(env.VITE_AFFILIATE_EBAY_CAMPAIGN_ID),
  };

  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return deploymentConfig;
  }

  try {
    const saved = JSON.parse(localStorage.getItem('streamflicker_affiliate_config') || 'null') as Partial<AffiliateConfig> | null;
    if (!saved || typeof saved !== 'object') return deploymentConfig;

    return {
      amazonTag: cleanValue(saved.amazonTag) || deploymentConfig.amazonTag,
      appleAffiliateToken: cleanValue(saved.appleAffiliateToken) || deploymentConfig.appleAffiliateToken,
      impactSubId: cleanValue(saved.impactSubId) || deploymentConfig.impactSubId,
      ebayCampId: cleanValue(saved.ebayCampId) || deploymentConfig.ebayCampId,
    };
  } catch {
    return deploymentConfig;
  }
}

// Returns an affiliate-monetized URL based on the platform and original URL
export function generateAffiliateUrl(
  url: string,
  platformId: string,
  config: AffiliateConfig = DEFAULT_AFFILIATE_CONFIG
): string {
  if (!url) return '#';

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return '#';

    switch (platformId.toLowerCase()) {
      case 'prime':
      case 'amazon':
        if (config.amazonTag.trim()) {
          parsedUrl.searchParams.set('tag', config.amazonTag.trim());
          parsedUrl.searchParams.set('linkCode', 'ur2');
        }
        return parsedUrl.toString();

      case 'appletv':
      case 'apple':
      case 'itunes':
        if (config.appleAffiliateToken.trim()) {
          parsedUrl.searchParams.set('at', config.appleAffiliateToken.trim());
          parsedUrl.searchParams.set('ct', 'streamflicker_web');
        }
        return parsedUrl.toString();

      case 'hulu':
      case 'max':
      case 'paramount':
      case 'shudder':
        if (config.impactSubId.trim()) {
          parsedUrl.searchParams.set('subid1', config.impactSubId.trim());
        }
        return parsedUrl.toString();

      case 'ebay':
        if (config.ebayCampId.trim()) {
          parsedUrl.searchParams.set('campid', config.ebayCampId.trim());
          parsedUrl.searchParams.set('customid', 'streamflicker');
        }
        return parsedUrl.toString();

      default:
        return url;
    }
  } catch {
    return url;
  }
}
