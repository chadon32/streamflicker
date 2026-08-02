import { useState, type Dispatch, type SetStateAction } from 'react';
import { CalendarDays, Check, ChevronDown, Filter, RotateCcw, Sparkles, X } from 'lucide-react';
import { STREAMING_PROVIDERS } from '../data/catalog';
import {
  ERA_FILTERS,
  GENRE_FILTERS,
  MICRO_TAG_DEFINITIONS,
  type CatalogFilterCounts,
  type EraFilterId,
} from '../services/catalogClassification';
import {
  DISCOVERY_MODE_OPTIONS,
  OCCASION_OPTIONS,
  type DiscoveryMode,
  type OccasionFilter,
} from '../services/discovery';

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
  discoveryMode,
  setDiscoveryMode,
  occasion,
  setOccasion,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const resetFilters = () => {
    setSelectedEra('All');
    setSelectedGenre('All');
    setSelectedTag(null);
    setSelectedProviders([]);
    setDiscoveryMode('all');
    setOccasion('all');
  };

  return (
    <div className="space-y-4 my-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-200" id="filter-help">
            Find the right movie for tonight.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Search a title, actor, theme, or occasion, then narrow the results.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="movie-filter-controls"
            className="xl:hidden inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200"
          >
            <Filter size={14} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            <ChevronDown
              size={14}
              className={mobileOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      <div id="movie-filter-controls" className={`${mobileOpen ? 'block' : 'hidden'} xl:block space-y-4`}>
        <div className="xl:hidden flex items-center justify-between gap-3 px-1">
          <p className="text-xs text-zinc-400">Choose filters, then close this panel to keep browsing.</p>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-950"
          >
            <Check size={13} aria-hidden="true" /> Done
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      discoveryMode === option.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md'
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      occasion === option.id
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/25'
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
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mr-2 shrink-0 flex items-center gap-1">
                <CalendarDays size={14} /> Era:
              </span>
              {ERA_FILTERS.filter(({ id }) => (counts.eras[id] ?? 0) > 0).map((era) => (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => setSelectedEra(era.id)}
                  aria-pressed={selectedEra === era.id}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    selectedEra === era.id
                      ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  {era.label} <span className="opacity-70">({counts.eras[era.id]})</span>
                </button>
              ))}

              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-4 mr-2 shrink-0 hidden md:inline">
                Genre:
              </span>
              {GENRE_FILTERS.filter((genre) => (counts.genres[genre] ?? 0) > 0).map((genre) => (
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedGenre === genre
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  {genre} <span className="opacity-70">({counts.genres[genre]})</span>
                </button>
              ))}
            </div>

            <div
              className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0"
              aria-label="Streaming service filters"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mr-2 shrink-0 flex items-center gap-1">
                <Filter size={14} /> Stream on:
              </span>

              <button
                type="button"
                onClick={() => setSelectedProviders([])}
                aria-pressed={selectedProviders.length === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1 ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
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
          </div>
        </div>

        {selectedGenre === 'Other' && (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-100/75">
            Other means the supplied synopsis does not provide enough evidence for one of StreamFlicker&apos;s focused genres.
          </p>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Movie theme filters">
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
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-600/30 text-rose-300 border border-rose-500/40 hover:bg-rose-600/50 shrink-0"
            >
              <X size={12} aria-hidden="true" /> Clear theme
            </button>
          )}

          {MICRO_TAG_DEFINITIONS.filter(({ id }) => (counts.tags[id] ?? 0) > 0).map((tag) => {
            const isSelected = selectedTag === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(isSelected ? null : tag.id)}
                aria-pressed={isSelected}
                title={tag.description}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/40 scale-105'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {tag.label} <span className="opacity-65">({counts.tags[tag.id]})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
