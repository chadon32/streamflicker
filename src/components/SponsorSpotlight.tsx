import { ExternalLink } from 'lucide-react';
import type { SponsorshipPlacement } from '../services/monetization';

interface SponsorSpotlightProps {
  sponsorship: SponsorshipPlacement;
}

export function SponsorSpotlight({ sponsorship }: SponsorSpotlightProps) {
  return (
    <aside
      aria-label={`Sponsored recommendation from ${sponsorship.name}`}
      className="mb-8 overflow-hidden rounded-2xl border border-rose-500/20 bg-zinc-950"
    >
      <div className={`grid ${sponsorship.imageUrl ? 'md:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]' : ''}`}>
        <div className="flex flex-col justify-center p-5 sm:p-7">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-300">
            Sponsored by {sponsorship.name}
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {sponsorship.headline}
          </h2>
          {sponsorship.copy && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {sponsorship.copy}
            </p>
          )}
          <a
            href={sponsorship.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500 active:scale-[0.98]"
          >
            {sponsorship.ctaLabel}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        {sponsorship.imageUrl && (
          <img
            src={sponsorship.imageUrl}
            alt=""
            width="720"
            height="405"
            loading="lazy"
            decoding="async"
            className="h-full min-h-48 w-full object-cover"
          />
        )}
      </div>
    </aside>
  );
}
