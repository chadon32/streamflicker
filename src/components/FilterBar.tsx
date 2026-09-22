import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { CalendarDays, Check, ChevronDown, Filter, RotateCcw, Sparkles, X } from 'lucide-react';
import { STREAMING_PROVIDERS } from '../data/catalog';
import {
  ERA_FILTERS,
  GENRE_FILTERS,
  MICRO_TAG_DEFINITIONS,
  getMicroTagLabel,
  type CatalogFilterCounts,
  type EraFilterId,
} from '../services/catalogClassification';
import {
  DISCOVERY_MODE_OPTIONS,
  OCCASION_OPTIONS,
  type DiscoveryMode,
  type OccasionFilter,
} from '../services/discovery';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface FilterBarProps {
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  selectedEra: EraFilterId;
  setSelectedEra: (era: EraFilterId) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedProviders: string[];
  setSelectedProviders: Dispatch<SetStateAction<string[]>>;
  counts: CatalogFilterCounts;
  resultCount: number;
  discoveryMode: DiscoveryMode;
  setDiscoveryMode: (mode: DiscoveryMode) => void;
  occasion: OccasionFilter;
  setOccasion: (occasion: OccasionFilter) => void;
}

export function FilterBar({
  selectedGenre,
  setSelectedGenre,
  selectedEra,
  setSelectedEra,
  selectedTag,
  setSelectedTag,
  selectedProviders,
  setSelectedProviders,
  counts,
  resultCount,
  discoveryMode,
  setDiscoveryMode,
  occasion,
  setOccasion,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const closeMobileFilters = useCallback(() => setMobileOpen(false), []);
  const isModal = mobileOpen && !isDesktop;
  const mobileDialogRef = useAccessibleDialog(closeMobileFilters, isModal);

  useEffect(() => {
    const breakpoint = window.matchMedia('(min-width: 1280px)');
    const syncBreakpoint = () => setIsDesktop(breakpoint.matches);
    breakpoint.addEventListener('change', syncBreakpoint);
    return () => breakpoint.removeEventListener('change', syncBreakpoint);
  }, []);

  const toggleProvider = (id: string) => {
    setSelectedProviders((current) =>
      current.includes(id)
        ? current.filter((provider) => provider !== id)
        : [...current.filter((provider) => provider !== 'my_services'), id],
    );
  };

  const toggleMyServices = () => {
    setSelectedProviders((current) => (current.includes('my_services') ? [] : ['my_services']));
  };

  const activeFilterCount = [
    selectedEra !== 'All',
    selectedGenre !== 'All',
    Boolean(selectedTag),
    selectedProviders.length > 0,
    discoveryMode !== 'all',
    occasion !== 'all',
  ].filter(Boolean).length;
  const hasVerifiedProviders = Object.values(counts.providers).some((count) => count > 0);
  const activeFilters = [
    ...(selectedGenre !== 'All' ? [{ label: selectedGenre, clear: () => setSelectedGenre('All') }] : []),
    ...(selectedEra !== 'All' ? [{ label: ERA_FILTERS.find(({ id }) => id === selectedEra)?.label ?? selectedEra, clear: () => setSelectedEra('All') }] : []),
    ...(selectedTag ? [{ label: getMicroTagLabel(selectedTag), clear: () => setSelectedTag(null) }] : []),
    ...(discoveryMode !== 'all' ? [{ label: 'Family-friendly', clear: () => setDiscoveryMode('all') }] : []),
    ...(occasion !== 'all' ? [{ label: OCCASION_OPTIONS.find(({ id }) => id === occasion)?.label ?? occasion, clear: () => setOccasion('all') }] : []),
    ...selectedProviders.map((id) => ({
      label: id === 'my_services' ? 'My services' : STREAMING_PROVIDERS.find((provider) => provider.id === id)?.name ?? id,
      clear: () => setSelectedProviders((current) => current.filter((provider) => provider !== id)),
    })),
  ];

  const resetFilters = () => {
    setSelectedEra('All');
    setSelectedGenre('All');
    setSelectedTag(null);
    setSelectedProviders([]);
    setDiscoveryMode('all');
    setOccasion('all');
  };

  return (
    <div className="space-y-4 my-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-200" id="filter-help">
            Make it your kind of movie.
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Narrow by genre, year, or a theme like zombies.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="movie-filter-controls"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            <Filter size={14} /> {mobileOpen ? 'Hide filters' : 'Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            <ChevronDown
              size={14}
              className={mobileOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Active filters">
          {activeFilters.map(({ label, clear }) => (
            <button key={label} type="button" onClick={clear} aria-label={`Remove ${label} filter`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-200 hover:bg-rose-500/20">
              {label}<X size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div
        id="movie-filter-controls"
        ref={mobileDialogRef}
        role={isModal ? 'dialog' : undefined}
        aria-modal={isModal || undefined}
        aria-labelledby={isModal ? 'mobile-filter-title' : undefined}
        tabIndex={isModal ? -1 : undefined}
        className={`${mobileOpen ? 'fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-zinc-950 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl xl:static xl:z-auto xl:block xl:overflow-visible xl:bg-transparent xl:p-0 xl:shadow-none' : 'hidden'} space-y-4`}
      >
        <div className="xl:hidden sticky top-0 z-10 -mx-4 -mt-4 mb-1 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div>
            <p id="mobile-filter-title" className="text-sm font-bold text-white">Filters</p>
            <p className="mt-0.5 text-xs text-zinc-400" role="status">{resultCount.toLocaleString()} matching {resultCount === 1 ? 'movie' : 'movies'}</p>
          </div>
          <button
            type="button"
            onClick={closeMobileFilters}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-950"
          >
            <Check size={13} aria-hidden="true" /> Show results
          </button>
        </div>
        <div className="flex flex-col gap-4 glass-panel p-4 rounded-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div aria-label="Viewing mode filters">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
                Viewing mode
              </span>
              <div className="flex flex-wrap gap-2">
                {DISCOVERY_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDiscoveryMode(option.id)}
                    aria-pressed={discoveryMode === option.id}
                    title={option.description}
                    className={`min-h-10 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      discoveryMode === option.id
                        ? 'bg-rose-500/15 text-rose-200 border-rose-400/60'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {discoveryMode === 'family' && (
                <p className="mt-2 text-[11px] text-emerald-200/75">
                  Filters out R-rated titles and high-risk horror or thriller themes. Always confirm the provider rating.
                </p>
              )}
            </div>

            <div aria-label="Occasion filters">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
                Tonight&apos;s plan
              </span>
              <div className="flex flex-wrap gap-2">
                {OCCASION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setOccasion(option.id)}
                    aria-pressed={occasion === option.id}
                    title={option.description}
                    className={`min-h-10 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      occasion === option.id
                        ? 'bg-rose-500/15 text-rose-200 border-rose-400/60'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {occasion !== 'all' && (
                <p className="mt-2 text-[11px] text-zinc-400">
                  {OCCASION_OPTIONS.find((option) => option.id === occasion)?.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div
              className="flex flex-wrap items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none"
              aria-label="Movie era and genre filters"
            >
              <span className="basis-full text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                <CalendarDays size={14} /> Era:
              </span>
              {ERA_FILTERS.filter(({ id }) => id === 'All' || id === selectedEra || (counts.eras[id] ?? 0) > 0).map((era) => (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => setSelectedEra(era.id)}
                  aria-pressed={selectedEra === era.id}
                  className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    selectedEra === era.id
                      ? 'bg-rose-500/15 text-rose-200 border-rose-400/60'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  {era.label} <span className="opacity-70">({counts.eras[era.id] ?? 0})</span>
                </button>
              ))}

              <span className="basis-full text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-3 mb-1">
                Genre:
              </span>
              {GENRE_FILTERS.filter((genre) => genre === 'All' || genre === selectedGenre || (counts.genres[genre] ?? 0) > 0).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  aria-pressed={selectedGenre === genre}
                  title={
                    genre === 'Other'
                      ? 'Titles whose supplied synopsis does not support one of the focused categories'
                      : undefined
                  }
                  className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    selectedGenre === genre
                      ? 'bg-rose-500/15 text-rose-200 border-rose-400/60'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  {genre} <span className="opacity-70">({counts.genres[genre] ?? 0})</span>
                </button>
              ))}
            </div>

            {hasVerifiedProviders && (
              <div
                className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0"
                aria-label="Verified streaming service filters"
              >
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mr-2 shrink-0 flex items-center gap-1">
                <Filter size={14} /> Stream on:
              </span>

              <button
                type="button"
                onClick={() => setSelectedProviders([])}
                aria-pressed={selectedProviders.length === 0}
                className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedProviders.length === 0
                    ? 'bg-zinc-100 text-zinc-950 font-extrabold'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All apps
              </button>

              <button
                type="button"
                onClick={toggleMyServices}
                aria-pressed={selectedProviders.includes('my_services')}
                className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1 ${
                  selectedProviders.includes('my_services')
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-zinc-900/80 border-zinc-800 text-emerald-500/50 hover:border-emerald-500/50 hover:text-emerald-400'
                }`}
              >
                My services
              </button>

              {STREAMING_PROVIDERS.filter(({ id }) => (counts.providers[id] ?? 0) > 0).map((provider) => {
                const isSelected = selectedProviders.includes(provider.id);
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => toggleProvider(provider.id)}
                    aria-pressed={isSelected}
                    className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/40'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span>{provider.name}</span>
                    <span className="opacity-65">({counts.providers[provider.id]})</span>
                    {isSelected && <Check size={12} aria-hidden="true" />}
                  </button>
                );
              })}
              </div>
            )}
          </div>
        </div>

        {selectedGenre === 'Other' && (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-100/75">
            Other means the supplied synopsis does not provide enough evidence for one of StreamFlicker&apos;s focused genres.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pb-2" aria-label="Movie theme filters">
          <span
            className="text-xs font-semibold text-rose-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1"
            title="Themes detected from the supplied movie synopsis."
          >
            <Sparkles size={13} /> Popular themes:
          </span>

          {selectedTag && (
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="flex min-h-10 items-center gap-1 rounded-full border border-rose-500/40 bg-rose-600/30 px-3 py-1 text-xs font-bold text-rose-300 hover:bg-rose-600/50 shrink-0"
            >
              <X size={12} aria-hidden="true" /> Clear theme
            </button>
          )}

          {MICRO_TAG_DEFINITIONS.filter(({ id }) => id === selectedTag || (counts.tags[id] ?? 0) > 0).map((tag) => {
            const isSelected = selectedTag === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(isSelected ? null : tag.id)}
                aria-pressed={isSelected}
                title={tag.description}
                className={`min-h-10 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-rose-500/15 text-rose-200 border-rose-400/60'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {tag.label} <span className="opacity-65">({counts.tags[tag.id] ?? 0})</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">Counts show each option within your search, before combining filters. Streaming services appear only with verified regional listings.</p>
      </div>
    </div>
  );
}
