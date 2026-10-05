import { ExternalLink, Tv } from 'lucide-react';
import {
  getAvailabilityUrl,
  getVerifiedStreamingPlatforms,
  type Movie,
} from '../data/catalog';
import { getAvailabilityAttribution, getAvailabilityCheckedLabel } from '../services/shareText';

interface AvailabilityLinksProps {
  movie: Movie;
  variant?: 'card' | 'hero' | 'detail' | 'watchlist';
}

function getStatusCopy(movie: Movie) {
  const region = movie.availability?.region ?? 'US';
  if (movie.availability?.status === 'verified') {
    return `Current ${region} options from JustWatch via TMDB, ${getAvailabilityCheckedLabel(movie)}.`;
  }
  if (movie.availability?.status === 'not-found') {
    return `No ${region} options were returned during the latest check.`;
  }
  if (movie.availability?.status === 'unavailable') {
    return `Live ${region} availability could not be checked.`;
  }
  return "We haven't checked streaming services for this title. Search to see where it's playing.";
}

export function AvailabilityLinks({ movie, variant = 'card' }: AvailabilityLinksProps) {
  const providers = getVerifiedStreamingPlatforms(movie);
  const availabilityUrl = getAvailabilityUrl(movie);

  if (variant === 'detail') {
    return (
      <section className="pt-4 border-t border-zinc-900" aria-labelledby={`availability-${movie.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Tv size={18} className="text-rose-500" aria-hidden="true" />
              <h3 id={`availability-${movie.id}`} className="text-sm font-bold text-white">
                Where to watch
              </h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">{getStatusCopy(movie)}</p>
          </div>
          <a
            href={availabilityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-white"
            aria-label={`Where to watch ${movie.title} (opens in a new tab)`}
          >
            Where to watch <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>

        {providers.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={`Verified ${movie.availability?.region ?? 'US'} providers`}>
            {providers.map((provider) => (
              <span
                key={`${provider.id}-${provider.type}`}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm font-semibold text-zinc-100"
              >
                <span>{provider.name}</span>
                <span className="text-xs uppercase tracking-wide text-ink-3">
                  {provider.type === 'subscription' ? 'stream' : provider.type}
                </span>
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-ink-3">
          Availability changes by country and date. StreamFlicker doesn&apos;t guess which service has a title, so confirm it before you subscribe or pay.
        </p>
        {movie.availability?.source === 'tmdb' && (
          <p className="mt-2 text-xs leading-relaxed text-ink-3">{getAvailabilityAttribution(movie)}</p>
        )}
      </section>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="flex max-w-full flex-wrap items-center gap-2">
        {providers.slice(0, 3).map((provider) => (
          <span key={`${provider.id}-${provider.type}`} className="hidden rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-zinc-200 lg:inline-flex">
            {provider.name}
          </span>
        ))}
        <a
          href={availabilityUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-white"
          aria-label={`Where to watch ${movie.title} (opens in a new tab)`}
        >
          Where to watch
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${variant === 'watchlist' ? '' : 'justify-start'}`}>
      {providers.slice(0, variant === 'watchlist' ? 3 : 1).map((provider) => (
        <span
          key={`${provider.id}-${provider.type}`}
          className="max-w-28 truncate rounded bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300"
        >
          {provider.name}
        </span>
      ))}
      <a
        href={availabilityUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-rose-300 hover:text-rose-200"
        aria-label={`Where to watch ${movie.title} (opens in a new tab)`}
      >
        <Tv size={12} aria-hidden="true" />
        {providers.length > 0 ? 'Options' : 'Where to watch'}
        <ExternalLink size={12} aria-hidden="true" />
      </a>
    </div>
  );
}
