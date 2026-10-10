import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { TMDB_NOTICE } from '../services/attribution';

type SitePage = 'about' | 'guide';

const navLinkClass = 'hidden min-h-11 items-center transition-colors hover:text-white aria-[current=page]:text-white md:inline-flex';
const footerLinkClass = 'inline-flex min-h-11 items-center transition-colors hover:text-white';

/**
 * Header for the static pages (About, the movie-night guide and the legal pages). Each of
 * them used to carry its own links; now every page offers the same two guides and the same
 * way back into the app.
 */
export function SiteHeader({ current }: { current?: SitePage }) {
  return (
    <header className="border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-20 sm:gap-6 sm:px-6 lg:px-8">
        <a href="/" className="flex min-h-11 min-w-0 items-center gap-2.5 sm:gap-3" aria-label="StreamFlicker home">
          <img
            src="/streamflicker-logo.svg"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-xl shadow-lg shadow-rose-600/25 sm:h-10 sm:w-10"
          />
          <span className="whitespace-nowrap font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            Stream<span className="text-rose-500">Flicker</span>
          </span>
        </a>
        <nav className="flex shrink-0 items-center gap-6 text-sm font-semibold text-ink-2" aria-label="Site">
          <a className={navLinkClass} href="/movie-night" aria-current={current === 'guide' ? 'page' : undefined}>Movie night guide</a>
          <a className={navLinkClass} href="/about" aria-current={current === 'about' ? 'page' : undefined}>About</a>
          <a href="/" className="btn btn-primary">
            Open the app
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
}

/**
 * The one footer: the same links, TMDB's logo and notice on every page. The app adds its own
 * controls (streaming services, sign in) as children, and the Amazon disclosure when it applies.
 */
export function SiteFooter({ children, disclosure }: { children?: ReactNode; disclosure?: ReactNode }) {
  return (
    <footer className="safe-area-bottom mt-auto border-t border-white/[0.08] pt-10">
      {/* Padding inside the 7xl box, like the header and the page content, so all three share one left edge. */}
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-xs leading-relaxed text-ink-3 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="max-w-xl space-y-2">
          <p className="font-display text-sm font-bold text-zinc-300">StreamFlicker</p>
          <p>© {new Date().getFullYear()} StreamFlicker. Movie discovery, not a streaming service.</p>
          <p className="flex items-start gap-2">
            <img src="/tmdb-logo.svg" alt="TMDB" width="92" height="12" loading="lazy" decoding="async" className="mt-1 h-3 w-auto shrink-0" />
            <span>{TMDB_NOTICE}</span>
          </p>
          {disclosure}
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-medium text-ink-2">
          <a className={footerLinkClass} href="/movie-night">Movie night guide</a>
          <a className={footerLinkClass} href="/about">About</a>
          <a className={footerLinkClass} href="/privacy">Privacy</a>
          <a className={footerLinkClass} href="/terms">Terms</a>
          <a className={footerLinkClass} href="/contact">Contact</a>
          {children}
        </nav>
      </div>
    </footer>
  );
}
