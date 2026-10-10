import { useCallback, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Check, ChevronDown, Filter, RotateCcw, X } from 'lucide-react';
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

/** A theme with only a handful of titles is noise as a filter chip. */
const MIN_THEME_RESULTS = 5;

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
  /** False until the full catalog has loaded; the counts are not meaningful before then. */
  catalogReady: boolean;
  /** Called when the panel opens, so the full catalog can load if it has not yet. */
  onOpen: () => void;
  /** Shortcut chips shown in the same row as the Filters button. */
  shortcuts?: ReactNode;
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
  catalogReady,
  onOpen,
  shortcuts,
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
    ...(discoveryMode !== 'all' ? [{ label: DISCOVERY_MODE_OPTIONS.find(({ id }) => id === discoveryMode)?.label ?? 'Rating filter', clear: () => setDiscoveryMode('all') }] : []),
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
    <div className="space-y-4">
      {/* One row for every way into the catalog: the shortcuts, then Filters (and Reset once something is set). */}
      <div className="flex flex-wrap items-center gap-2 pt-2" role="group" aria-label="Ways to discover movies">
        {shortcuts}
        <div className="flex gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => {
              if (!mobileOpen) onOpen();
              setMobileOpen((open) => !open);
            }}
            aria-expanded={mobileOpen}
            aria-controls="movie-filter-controls"
            className="chip"
          >
            <Filter size={15} aria-hidden="true" /> {mobileOpen ? 'Hide filters' : 'Filters'}
            {activeFilterCount > 0 && <span className="chip-count">{activeFilterCount}<span className="sr-only"> active</span></span>}
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={mobileOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={resetFilters} className="chip">
              <RotateCcw size={14} aria-hidden="true" /> Reset
            </button>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Active filters">
          {activeFilters.map(({ label, clear }) => (
            <button key={label} type="button" onClick={clear} aria-label={`Remove ${label} filter`} className="chip chip-selected">
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
            <p className="mt-0.5 text-xs text-ink-2" role="status">{catalogReady ? `${resultCount.toLocaleString()} matching ${resultCount === 1 ? 'movie' : 'movies'}` : 'Loading the catalog…'}</p>
          </div>
          <button type="button" onClick={closeMobileFilters} className="btn btn-primary">
            <Check size={15} aria-hidden="true" /> Show results
          </button>
        </div>

        {!catalogReady ? (
          <p role="status" className="notice text-sm">Loading filters…</p>
        ) : (
          <>
        {/* Boxed only where it sits inline on wide screens; the phone sheet is already its own surface. */}
        <div className="flex flex-col gap-6 xl:rounded-2xl xl:border xl:border-white/[0.08] xl:bg-zinc-900/60 xl:p-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div role="group" aria-labelledby="filter-rating-label">
              <p id="filter-rating-label" className="eyebrow mb-2">Rating</p>
              <div className="flex flex-wrap gap-2">
                {DISCOVERY_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDiscoveryMode(option.id)}
                    aria-pressed={discoveryMode === option.id}
                    title={option.description}
                    className="chip"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {discoveryMode === 'family' && (
                <p className="mt-2 text-xs leading-relaxed text-ink-2">
                  Only titles with a confirmed PG-13 or lower rating, minus high-risk horror and thriller themes. Always confirm the rating before you watch.
                </p>
              )}
            </div>

            <div role="group" aria-labelledby="filter-occasion-label">
              <p id="filter-occasion-label" className="eyebrow mb-2">Occasion</p>
              <div className="flex flex-wrap gap-2">
                {OCCASION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setOccasion(option.id)}
                    aria-pressed={occasion === option.id}
                    title={option.description}
                    className="chip"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {occasion !== 'all' && (
                <p className="mt-2 text-xs leading-relaxed text-ink-2">
                  {OCCASION_OPTIONS.find((option) => option.id === occasion)?.description}
                </p>
              )}
            </div>
          </div>

          <div role="group" aria-labelledby="filter-era-label">
            <p id="filter-era-label" className="eyebrow mb-2">Era</p>
            <div className="flex flex-wrap gap-2">
              {ERA_FILTERS.filter(({ id }) => id === 'All' || id === selectedEra || (counts.eras[id] ?? 0) > 0).map((era) => (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => setSelectedEra(era.id)}
                  aria-pressed={selectedEra === era.id}
                  className="chip"
                >
                  {era.label} <span className="chip-count">{(counts.eras[era.id] ?? 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div role="group" aria-labelledby="filter-genre-label">
            <p id="filter-genre-label" className="eyebrow mb-2">Genre</p>
            <div className="flex flex-wrap gap-2">
              {GENRE_FILTERS.filter((genre) => genre === 'All' || genre === selectedGenre || (counts.genres[genre] ?? 0) > 0).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  aria-pressed={selectedGenre === genre}
                  title={
                    genre === 'Other'
                      ? 'Titles whose synopsis does not fit one of the focused categories'
                      : undefined
                  }
                  className="chip"
                >
                  {genre} <span className="chip-count">{(counts.genres[genre] ?? 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
            {selectedGenre === 'Other' && (
              <p className="notice notice-warn mt-3">
                Other means the synopsis doesn&apos;t give enough evidence for one of StreamFlicker&apos;s focused genres.
              </p>
            )}
          </div>

          {hasVerifiedProviders && (
            <div role="group" aria-labelledby="filter-service-label">
              <p id="filter-service-label" className="eyebrow mb-2">Streaming service</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProviders([])}
                  aria-pressed={selectedProviders.length === 0}
                  className="chip"
                >
                  All services
                </button>

                <button
                  type="button"
                  onClick={toggleMyServices}
                  aria-pressed={selectedProviders.includes('my_services')}
                  className="chip"
                >
                  My services
                </button>

                {STREAMING_PROVIDERS.filter(({ id }) => (counts.providers[id] ?? 0) > 0).map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => toggleProvider(provider.id)}
                    aria-pressed={selectedProviders.includes(provider.id)}
                    className="chip"
                  >
                    {provider.name} <span className="chip-count">{(counts.providers[provider.id] ?? 0).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div role="group" aria-labelledby="filter-theme-label">
            <p id="filter-theme-label" className="eyebrow mb-2" title="Themes detected from each movie's synopsis.">Popular themes</p>
            <div className="flex flex-wrap gap-2">
              {selectedTag && (
                <button type="button" onClick={() => setSelectedTag(null)} className="chip">
                  <X size={14} aria-hidden="true" /> Clear theme
                </button>
              )}

              {MICRO_TAG_DEFINITIONS.filter(({ id }) => id === selectedTag || (counts.tags[id] ?? 0) >= MIN_THEME_RESULTS).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                  aria-pressed={selectedTag === tag.id}
                  title={tag.description}
                  className="chip"
                >
                  {tag.label} <span className="chip-count">{(counts.tags[tag.id] ?? 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink-2">Counts show each option within your search, before combining filters. Streaming services appear only with verified regional listings.</p>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
