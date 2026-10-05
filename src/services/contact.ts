const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

/** A deployment-configured public contact address, or '' when none is set (or it is malformed). */
export function parseContactEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  return candidate.length <= 254 && EMAIL_PATTERN.test(candidate) ? candidate : '';
}

/**
 * The public contact address shown on the Contact, Privacy and Terms pages.
 * Set VITE_CONTACT_EMAIL in the deployment environment; it is never hard-coded
 * so a personal address cannot ship by accident.
 */
export function getContactEmail(): string {
  return parseContactEmail((import.meta.env as Record<string, string | undefined>).VITE_CONTACT_EMAIL);
}
