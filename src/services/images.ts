const TMDB_IMAGE_SIZE_PATTERN = /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\//;

export function getTMDBImageUrl(url: string, width: number): string {
  if (!TMDB_IMAGE_SIZE_PATTERN.test(url)) return url;
  return url.replace(TMDB_IMAGE_SIZE_PATTERN, `https://image.tmdb.org/t/p/w${width}/`);
}

export function getTMDBImageSrcSet(url: string, widths: number[]): string | undefined {
  if (!TMDB_IMAGE_SIZE_PATTERN.test(url)) return undefined;
  return widths.map((width) => `${getTMDBImageUrl(url, width)} ${width}w`).join(', ');
}
