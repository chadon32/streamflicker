import { ExternalLink, Tv } from 'lucide-react';
import {
  getAvailabilityUrl,
  getVerifiedStreamingPlatforms,
  type Movie,
} from '../data/catalog';
import { getAvailabilityAttribution, getAvailabilityCheckedLabel, getAvailabilityDisclosure, getMovieSourceLabel } from '../services/shareText';

interface AvailabilityLinksProps {
  movie: Movie;
  variant?: 'card' | 'hero' | 'detail' | 'watchlist';
}

function getStatusCopy(movie: Movie) {
  const region = movie.availability?.region ?? 'US';
  if (movie.availability?.status === 'verified') {
    return `Current ${region} options from JustWatch via TMDB`;
  }
  if (movie.availability?.status === 'not-found') {
    return `No ${region} options were returned during the latest check`;
  }
  if (movie.availability?.status === 'unavailable') {
    return `Live ${region} availability could not be checked`;
  }
  return `Search current ${region} availability`;
}

function getSourceLabel(movie: Movie) {
  return getMovieSourceLabel(movie);
}

export function AvailabilityLinks({ movie, variant = 'card' }: AvailabilityLinksProps) {
  const providers = getVerifiedStreamingPlatforms(movie);
  const availabilityUrl = getAvailabilityUrl(movie);
  const statusCopy = getStatusCopy(movie);

  if (variant === 'detail') {
    return (
      <section className="pt-4 border-t border-zinc-900" aria-labelledby={`availability-${movie.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Tv size={18} className="text-rose-500" aria-hidden="true" />
              <h4 id={`availability-${movie.id}`} className="text-sm font-bold text-white uppercase tracking-wider">
                Where to watch
              </h4>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{statusCopy}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">{getAvailabilityDisclosure(movie)}</p>
          </div>
          <a
            href={availabilityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-white"
            aria-label={`Check current availability for ${movie.title} (opens availability details in a new tab)`}
          >
            Check current availability <ExternalLink size={14} aria-hidden="true" />
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
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {provider.type === 'subscription' ? 'stream' : provider.type}
                </span>
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Availability changes by country and date. StreamFlicker does not guess providers from its bundled catalog; confirm the title before subscribing or paying.
        </p>
        {movie.availability?.source === 'tmdb' && (
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">{getAvailabilityAttribution(movie)}</p>
        )}
      </section>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="flex max-w-full flex-wrap items-center gap-2 bg-zinc-900/75 border border-zinc-800/80 p-2 rounded-2xl backdrop-blur-md">
        {providers.slice(0, 3).map((provider) => (
          <span key={`${provider.id}-${provider.type}`} className="hidden rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-zinc-200 lg:inline-flex">
            {provider.name}
          </span>
        ))}
        <a
          href={availabilityUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-white"
          aria-label={`Check current availability for ${movie.title} (opens availability details in a new tab)`}
        >
          {providers.length > 0 ? 'View options' : 'Check availability'}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
        <span className="max-w-44 text-[9px] font-semibold leading-tight text-zinc-500" title={getAvailabilityDisclosure(movie)}>
          <span className="block truncate">{getSourceLabel(movie)} · {(movie.availability?.region ?? 'US').toUpperCase()} · {movie.availability?.status ?? 'unknown'}</span>
          <span className="block truncate">{getAvailabilityCheckedLabel(movie)}</span>
        </span>
      </div>
    );
  }

  const compactClass = variant === 'watchlist'
    ? 'flex flex-wrap items-center gap-1.5'
    : 'flex min-w-0 items-center gap-1.5';

  return (
    <div className={compactClass} title={`${statusCopy}. ${getAvailabilityDisclosure(movie)}`}>
      {providers.slice(0, variant === 'watchlist' ? 3 : 1).map((provider) => (
        <span
          key={`${provider.id}-${provider.type}`}
          className="max-w-24 truncate rounded bg-zinc-800 px-2 py-1 text-[9px] font-bold text-zinc-300"
        >
          {provider.name}
        </span>
      ))}
      <span className="max-w-36 text-[9px] font-semibold leading-tight text-zinc-500" aria-label={getAvailabilityDisclosure(movie)}>
        <span className="block truncate">{getSourceLabel(movie)} · {(movie.availability?.region ?? 'US').toUpperCase()} · {movie.availability?.status ?? 'unknown'}</span>
        <span className="block truncate">{getAvailabilityCheckedLabel(movie)}</span>
      </span>
      <a
        href={availabilityUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-[10px] font-bold text-zinc-300 hover:border-zinc-600 hover:text-white"
        aria-label={`Check current availability for ${movie.title} (opens availability details in a new tab)`}
      >
        <Tv size={12} aria-hidden="true" />
        {providers.length > 0 ? 'Options' : 'Where to watch'}
        <ExternalLink size={10} aria-hidden="true" />
      </a>
    </div>
  );
}
