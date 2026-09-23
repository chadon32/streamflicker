import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import {
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Film,
  Heart,
  RefreshCw,
  Share2,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import type { Movie } from '../data/catalog';
import { STREAMING_PROVIDERS } from '../data/catalog';
import { AvailabilityLinks } from './AvailabilityLinks';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import {
  getMovieNightGenres,
  getMovieNightSummary,
  getMovieNightCandidates,
  selectMovieNightMovies,
  deduplicateMovieNightPlans,
  normalizeMovieNightPlan,
  type MovieNightLength,
  type MovieNightOccasion,
  type MovieNightPlan,
  type MovieNightPreferences,
} from '../services/movieNight';
import { getTMDBImageSrcSet } from '../services/images';
import { CATALOG_CHECKED_AT } from '../services/catalogQuality';
import { buildMovieNightShareText } from '../services/shareText';

interface MovieNightPlannerProps {
  movies: Movie[];
  watchlist: Movie[];
  onClose: () => void;
  onWatchTrailer: (movie: Movie) => void;
  isBookmarked: (movieId: string) => boolean;
  onToggleBookmark: (movie: Movie) => void;
}

const OCCASION_OPTIONS: Array<{ id: MovieNightOccasion; label: string; icon: typeof Heart }> = [
  { id: 'any', label: 'Anything goes', icon: Sparkles },
  { id: 'family', label: 'Family night', icon: UsersRound },
  { id: 'date-night', label: 'Date night', icon: Heart },
  { id: 'friends', label: 'Friends night', icon: UsersRound },
  { id: 'solo', label: 'Just me', icon: Film },
];

const LENGTH_OPTIONS: Array<{ id: MovieNightLength; label: string }> = [
  { id: 'any', label: 'Any length' },
  { id: 'short', label: '100 min or less' },
  { id: 'standard', label: '101–150 min' },
  { id: 'epic', label: 'Over 150 min' },
];

const PLAN_STORAGE_KEY = 'streamflicker_movie_night_plans';
const SAVED_PLAN_LIMIT = 12;
const MAX_RECOMMENDATIONS = 3;
const MAX_REROLLS = 1;

function getDefaultPreferences(): MovieNightPreferences {
  return { occasion: 'any', length: 'any', genre: 'All', providerId: 'any' };
}

function savePlanLocally(plan: MovieNightPlan): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) ?? '[]') as unknown;
    const previous = Array.isArray(stored)
      ? stored.flatMap((item) => {
        const savedPlan = normalizeMovieNightPlan(item);
        return savedPlan ? [savedPlan] : [];
      })
      : [];
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(deduplicateMovieNightPlans([plan, ...previous], SAVED_PLAN_LIMIT)));
    return true;
  } catch {
    return false;
  }
}

function loadSavedPlans(): MovieNightPlan[] {
  try {
    const stored = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(stored)) return [];
    return deduplicateMovieNightPlans(stored.flatMap((item) => {
      const savedPlan = normalizeMovieNightPlan(item);
      return savedPlan ? [savedPlan] : [];
    }), SAVED_PLAN_LIMIT);
  } catch {
    return [];
  }
}

export function MovieNightPlanner({
  movies,
  watchlist,
  onClose,
  onWatchTrailer,
  isBookmarked,
  onToggleBookmark,
}: MovieNightPlannerProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [preferences, setPreferences] = useState<MovieNightPreferences>(getDefaultPreferences);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<'idle' | 'saved' | 'save-error' | 'shared' | 'copied' | 'error'>('idle');
  const [savedPlans, setSavedPlans] = useState<MovieNightPlan[]>(loadSavedPlans);
  const [restoredMovieIds, setRestoredMovieIds] = useState<string[] | null>(null);
  const genres = useMemo(() => getMovieNightGenres(movies), [movies]);
  const providerOptions = useMemo(() => {
    const available = new Set(movies.flatMap((movie) =>
      movie.availability?.status === 'verified'
        ? movie.streamingPlatforms
          .filter((provider) => provider.availabilityStatus === 'verified')
          .map((provider) => provider.id)
        : []));
    return STREAMING_PROVIDERS.filter((provider) => available.has(provider.id));
  }, [movies]);
  const watchlistIds = useMemo(() => new Set(watchlist.map((movie) => movie.id)), [watchlist]);
  const strictCandidates = useMemo(
    () => getMovieNightCandidates(movies, preferences, watchlistIds),
    [movies, preferences, watchlistIds],
  );
  const restoredMovies = useMemo(() => {
    if (!restoredMovieIds) return null;
    const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
    return restoredMovieIds.flatMap((movieId) => {
      const movie = moviesById.get(movieId);
      return movie ? [movie] : [];
    }).slice(0, MAX_RECOMMENDATIONS);
  }, [movies, restoredMovieIds]);
  const restoredUnavailableCount = restoredMovieIds?.length ? restoredMovieIds.length - (restoredMovies?.length ?? 0) : 0;
  const recommendations = useMemo(
    () => restoredMovies ?? selectMovieNightMovies(movies, preferences, round, MAX_RECOMMENDATIONS, watchlistIds),
    [movies, preferences, restoredMovies, round, watchlistIds],
  );
  const shortlistHeading = recommendations.length === 0
    ? '0 picks—try another mix'
    : `${recommendations.length} pick${recommendations.length === 1 ? '' : 's'}, less debate`;

  useEffect(() => {
    if (preferences.providerId !== 'any' && !providerOptions.some(({ id }) => id === preferences.providerId)) {
      setPreferences((current) => ({ ...current, providerId: 'any' }));
      setRound(0);
    }
  }, [preferences.providerId, providerOptions]);

  const updatePreference = <K extends keyof MovieNightPreferences>(key: K, value: MovieNightPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setRestoredMovieIds(null);
    setRound(0);
    setStatus('idle');
  };

  const getPlan = (): MovieNightPlan => ({
    createdAt: new Date().toISOString(),
    preferences,
    movieIds: recommendations.map((movie) => movie.id),
  });

  const planText = buildMovieNightShareText(getMovieNightSummary(preferences), recommendations);

  const handleSave = () => {
    if (recommendations.length === 0) return;
    const plan = getPlan();
    if (!savePlanLocally(plan)) {
      setStatus('save-error');
      return;
    }
    setSavedPlans((current) => deduplicateMovieNightPlans([plan, ...current], SAVED_PLAN_LIMIT));
    setStatus('saved');
  };

  const resetPreferences = () => {
    setPreferences(getDefaultPreferences());
    setRestoredMovieIds(null);
    setRound(0);
    setStatus('idle');
  };

  const hasAlternatives = round < MAX_REROLLS && strictCandidates.length > recommendations.length;

  const handlePickAgain = () => {
    setRestoredMovieIds(null);
    setRound((current) => current + 1);
    setStatus('idle');
  };

  const handleShare = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: 'My StreamFlicker movie night',
          text: planText,
          dialogTitle: 'Share movie night',
        });
        setStatus('shared');
        return;
      }
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(planText);
      setStatus('copied');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('cancel')) return;
      setStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/85 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-night-dialog-title"
        aria-describedby="movie-night-dialog-description"
        tabIndex={-1}
        className="glass-modal flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-rose-500/25 shadow-[0_0_70px_rgba(225,29,72,0.2)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/90 px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white sm:flex">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="movie-night-dialog-title" className="font-display text-xl font-black text-white sm:text-2xl">
                Plan a movie night
              </h2>
              <p id="movie-night-dialog-description" className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
                 Three quick choices. A shortlist for tonight.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close movie night planner" className="min-h-11 min-w-11 rounded-full p-2.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className="space-y-5" aria-label="Movie night preferences">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">Step 1</p>
                <h3 className="font-display text-lg font-bold text-white">Who is watching?</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                  {OCCASION_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={preferences.occasion === id}
                      onClick={() => updatePreference('occasion', id)}
                      className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${preferences.occasion === id ? 'border-rose-400/70 bg-rose-500/15 text-rose-100' : 'border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-600 hover:text-white'}`}
                    >
                      <Icon size={16} className={preferences.occasion === id ? 'text-rose-300' : 'text-zinc-500'} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">Step 2</p>
                <h3 className="font-display text-lg font-bold text-white">How much time do you have?</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {LENGTH_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={preferences.length === id}
                      onClick={() => updatePreference('length', id)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${preferences.length === id ? 'border-amber-400/70 bg-amber-500/15 text-amber-100' : 'border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-600 hover:text-white'}`}
                    >
                      <Clock3 size={14} className="mr-1.5 inline-block text-amber-300" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">Step 3</p>
                <label htmlFor="movie-night-genre" className="font-display text-lg font-bold text-white">Pick a vibe</label>
                <select
                  id="movie-night-genre"
                  value={preferences.genre}
                  onChange={(event) => updatePreference('genre', event.target.value)}
                  className="mt-3 min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="All">Any genre</option>
                  {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                </select>
              </div>

              {providerOptions.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">Step 4</p>
                  <h3 className="font-display text-lg font-bold text-white">Where can you watch?</h3>
                  <label htmlFor="movie-night-provider" className="sr-only">Choose a verified streaming service</label>
                  <select
                    id="movie-night-provider"
                    value={preferences.providerId}
                    onChange={(event) => updatePreference('providerId', event.target.value)}
                    className="mt-3 min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="any">Any service</option>
                    {providerOptions.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                  </select>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">Services appear only when availability has been verified for a title. Availability can vary by title and region.</p>
                </div>
              ) : (
                <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">Service availability is checked for each title. Use “Where to watch” on a pick to check your region.</p>
              )}

              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4">
                <p className="text-xs font-semibold text-sky-100">{watchlist.length > 0 ? `${watchlist.length} saved movie${watchlist.length === 1 ? '' : 's'} are included in your choices.` : 'Save a few movies to your Watchlist and they will be considered here.'}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-sky-100/60">Your picks are based on the movies currently on this device. Saving keeps this list in this browser.</p>
              </div>
            </section>

            <section className="min-w-0" aria-live="polite" aria-label="Movie night shortlist">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                   <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Your shortlist</p>
                   <h3 className="mt-1 font-display text-xl font-black text-white">{shortlistHeading}</h3>
                   <p className="mt-1 text-xs text-zinc-400">{getMovieNightSummary(preferences)}</p>
                   <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">Offline curated subset checked {CATALOG_CHECKED_AT}. Availability is a US discovery check; recheck before watching.</p>
                </div>
                <button type="button" onClick={handlePickAgain} disabled={!hasAlternatives} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-rose-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                  <RefreshCw size={15} /> Pick again
                </button>
              </div>

              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4" role="status">
                    <p className="text-sm font-bold text-amber-100">{restoredMovieIds ? `${restoredUnavailableCount} saved title${restoredUnavailableCount === 1 ? ' is' : 's are'} no longer available in the current catalog.` : 'No titles match every choice.'}</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-100/70">{restoredMovieIds ? 'Generate a new set from the saved preferences, or reset them to broaden the match.' : 'Broaden or reset your preferences to see a new set of matches.'}</p>
                    <button type="button" onClick={resetPreferences} className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-amber-300/40 px-3 py-2 text-xs font-bold text-amber-100 hover:border-amber-200 hover:text-white">Reset preferences</button>
                  </div>
                ) : recommendations.map((movie, index) => (
                  <article key={movie.id} className="group flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/65 p-3 transition hover:border-rose-500/40 sm:gap-4 sm:p-4">
                    <img src={movie.posterUrl} srcSet={getTMDBImageSrcSet(movie.posterUrl, [185, 342, 500])} sizes="88px" alt={`${movie.title} poster`} width="88" height="132" loading="lazy" decoding="async" className="h-28 w-20 shrink-0 rounded-xl object-cover sm:h-32 sm:w-[88px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-xs font-black text-rose-300">{index + 1}</span>
                        <div className="min-w-0">
                          <h4 className="line-clamp-2 font-display text-base font-bold text-white sm:text-lg">{movie.title}</h4>
                          <p className="mt-0.5 truncate text-xs text-zinc-400">{movie.year} · {movie.duration} · {movie.genre.slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{movie.description}</p>
                      <div className="mt-3">
                        <AvailabilityLinks movie={movie} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => onWatchTrailer(movie)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500">
                          <Film size={14} /> See trailer
                        </button>
                        <button type="button" onClick={() => onToggleBookmark(movie)} aria-label={isBookmarked(movie.id) ? `Remove ${movie.title} from Watchlist` : `Save ${movie.title} to Watchlist`} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${isBookmarked(movie.id) ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-zinc-700 bg-zinc-950/50 text-zinc-300 hover:border-zinc-500 hover:text-white'}`}>
                          {isBookmarked(movie.id) ? <Check size={14} /> : <Bookmark size={14} />}
                          {isBookmarked(movie.id) ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                    <ChevronRight size={18} className="mt-1 hidden text-zinc-700 transition group-hover:text-rose-400 sm:block" aria-hidden="true" />
                  </article>
                ))}
              </div>

              {restoredMovieIds && recommendations.length > 0 && (
                <div className="mt-3 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100" role="status">
                  Restored {recommendations.length} saved title{recommendations.length === 1 ? '' : 's'} from this browser.
                  {restoredUnavailableCount > 0 && ` ${restoredUnavailableCount} saved title${restoredUnavailableCount === 1 ? ' is' : 's are'} no longer available in the current catalog.`}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={handleSave} disabled={recommendations.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                  <Check size={15} /> Save movie night
                </button>
                <button type="button" onClick={() => void handleShare()} disabled={recommendations.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {Capacitor.isNativePlatform() ? <Share2 size={15} /> : <Copy size={15} />}
                  {Capacitor.isNativePlatform() ? 'Share with iPhone' : 'Copy plan'}
                </button>
              </div>
              {status === 'saved' && <p role="status" className="mt-3 text-xs font-semibold text-emerald-300">Movie night saved on this device.</p>}
              {status === 'save-error' && <p role="alert" className="mt-3 text-xs font-semibold text-rose-300">Movie night could not be saved on this device. You can still copy the plan.</p>}
              {status === 'shared' && <p role="status" className="mt-3 text-xs font-semibold text-emerald-300">The iOS share sheet finished.</p>}
              {status === 'copied' && <p role="status" className="mt-3 text-xs font-semibold text-emerald-300">Plan copied—send it to your group chat.</p>}
              {status === 'error' && <p role="alert" className="mt-3 text-xs font-semibold text-rose-300">Sharing was unavailable. You can still save the plan on this device.</p>}

              {savedPlans.length > 0 && (
                <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4" aria-labelledby="saved-movie-nights-heading">
                  <div className="flex items-center justify-between gap-3">
                    <h4 id="saved-movie-nights-heading" className="font-display text-sm font-bold text-white">Saved movie nights</h4>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">On this device</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {savedPlans.slice(0, 3).map((plan, index) => (
                      <button
                        key={`${plan.createdAt}-${index}`}
                        type="button"
                        onClick={() => {
                          setPreferences(plan.preferences);
                          setRestoredMovieIds(plan.movieIds);
                          setRound(0);
                          setStatus('idle');
                        }}
                        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-left text-xs text-zinc-300 hover:border-rose-400/50 hover:text-white"
                      >
                        <span className="truncate">{getMovieNightSummary(plan.preferences)}</span>
                        <span className="shrink-0 font-bold text-rose-300">Restore</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
