export interface AffiliateConfig {
  amazonTag: string;
  appleAffiliateToken: string;
  impactSubId: string;
  ebayCampId: string;
}

export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  amazonTag: 'streamflicker-20',
  appleAffiliateToken: '1000l33x',
  impactSubId: 'streamflicker',
  ebayCampId: '5338123456',
};

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
        parsedUrl.searchParams.set('tag', config.amazonTag || 'streamflicker-20');
        parsedUrl.searchParams.set('linkCode', 'ur2');
        return parsedUrl.toString();

      case 'appletv':
      case 'apple':
      case 'itunes':
        parsedUrl.searchParams.set('at', config.appleAffiliateToken || '1000l33x');
        parsedUrl.searchParams.set('ct', 'streamflicker_web');
        return parsedUrl.toString();

      case 'hulu':
      case 'max':
      case 'paramount':
      case 'shudder':
        parsedUrl.searchParams.set('subid1', config.impactSubId || 'streamflicker');
        return parsedUrl.toString();

      case 'ebay':
        parsedUrl.searchParams.set('campid', config.ebayCampId || '5338123456');
        parsedUrl.searchParams.set('customid', 'streamflicker');
        return parsedUrl.toString();

      default:
        return url;
    }
  } catch {
    return url;
  }
}
