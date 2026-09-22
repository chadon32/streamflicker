import { Heart, Mail, Megaphone } from 'lucide-react';
import type { PublicMonetizationLinks } from '../services/monetization';

interface MonetizationPanelProps {
  links: PublicMonetizationLinks;
}

export function MonetizationPanel({ links }: MonetizationPanelProps) {
  const hasAnyLink = Boolean(links.supportUrl || links.newsletterUrl || links.sponsorInquiryUrl);
  if (!hasAnyLink) return null;

  return (
    <section aria-labelledby="support-streamflicker-title" className="mb-12 mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="grid md:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-zinc-800 p-6 sm:p-8 md:border-b-0 md:border-r">
          <h2 id="support-streamflicker-title" className="font-display text-2xl font-bold tracking-tight text-white">
            Help fund better movie discovery
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            Support catalog improvements, focused filters, and faster ways to pick tonight&apos;s movie.
          </p>
          {links.supportUrl && (
            <a
              href={links.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500 active:scale-[0.98]"
            >
              <Heart size={16} aria-hidden="true" />
              Support StreamFlicker
            </a>
          )}
        </div>

        <div className="divide-y divide-zinc-800">
          {links.newsletterUrl && (
            <a
              href={links.newsletterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-24 items-center gap-4 p-5 text-left transition-colors hover:bg-zinc-900 active:bg-zinc-800"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-rose-300">
                <Mail size={18} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-white">Get weekly movie picks</span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-500">A compact shortlist for family nights, date nights, and quick watches.</span>
              </span>
            </a>
          )}
          {links.sponsorInquiryUrl && (
            <a
              href={links.sponsorInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-24 items-center gap-4 p-5 text-left transition-colors hover:bg-zinc-900 active:bg-zinc-800"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-rose-300">
                <Megaphone size={18} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-white">Sponsor StreamFlicker</span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-500">Reach movie-night planners through clearly disclosed placements.</span>
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
