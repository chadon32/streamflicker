import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { STREAMING_PROVIDERS, type Movie } from './data/catalog';
import { searchTMDB } from './services/tmdbApi';
import { smartSearchMovies } from './services/smartSearch';
import {
  applyCatalogFilters,
  ERA_FILTERS,
  getCatalogFilterCounts,
  normalizeMovieClassification,
  type EraFilterId,
} from './services/catalogClassification';
import {
  getSearchReason,
  matchesDiscoveryMode,
  matchesOccasion,
  type DiscoveryMode,
  type OccasionFilter,
} from './services/discovery';
import { generateAffiliateUrl, DEFAULT_AFFILIATE_CONFIG, type AffiliateConfig } from './services/affiliate';
import { Navbar } from './components/Navbar';
import { HeroCarousel } from './components/HeroCarousel';
import { FilterBar } from './components/FilterBar';
import { MovieCard } from './components/MovieCard';
import { MovieRow } from './components/MovieRow';
import { TrailerModal } from './components/TrailerModal';
import { ShareModal } from './components/ShareModal';
import { SettingsModal } from './components/SettingsModal';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { WatchlistModal } from './components/WatchlistModal';
import { AuthModal } from './components/AuthModal';
import { AlertsModal } from './components/AlertsModal';
import { Film, Clapperboard, Sparkles, Skull, Award, Flame, Ghost } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

const WATCHLIST_STORAGE_KEY = 'streamflicker_watchlist';
const PROVIDER_METADATA = new Map<string, (typeof STREAMING_PROVIDERS)[number]>(
  STREAMING_PROVIDERS.map((provider) => [provider.id, provider]),
);

function normalizeVisibleText(value: string) {
  return value.replace(/[\u2013\u2014]/g, '-');
}

function parseStoredWatchlist(value: string | null): Movie[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Movie =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Movie).id === 'string' &&
        typeof (item as Movie).title === 'string' &&
        Array.isArray((item as Movie).streamingPlatforms),
    );
  } catch {
    return [];
  }
}

export function AppContent() {
  const [catalog, setCatalog] = useState<Movie[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogUsingFallback, setCatalogUsingFallback] = useState(false);
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedEra, setSelectedEra] = useState<EraFilterId>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('all');
  const [occasion, setOccasion] = useState<OccasionFilter>('all');
  
  // Live TMDB Results State
  const [tmdbResults, setTmdbResults] = useState<Movie[]>([]);
  const [isSearchingTMDB, setIsSearchingTMDB] = useState(false);

  // Modals State
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);
  const [shareMovie, setShareMovie] = useState<Movie | null>(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [alertMovie, setAlertMovie] = useState<Movie | null>(null);

  useEffect(() => {
    let cancelled = false;

    setCatalogStatus('loading');
    import('./data/movies')
      .then(({ SAMPLE_MOVIES }) => {
        if (cancelled) return;
        setCatalog(SAMPLE_MOVIES);
        setCatalogUsingFallback(false);
        setCatalogStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // A previously saved Watchlist is a useful local fallback while the catalog chunk is retried.
        const fallback = parseStoredWatchlist(localStorage.getItem(WATCHLIST_STORAGE_KEY));
        if (fallback.length > 0) {
          setCatalog(fallback);
          setCatalogUsingFallback(true);
          setCatalogStatus('ready');
        } else {
          setCatalogStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalogReloadToken]);

  // Auth state
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  // Affiliate Config State
  const [affiliateConfig, setAffiliateConfig] = useState<AffiliateConfig>(() => {
    try {
      const saved = localStorage.getItem('streamflicker_affiliate_config');
      return saved ? JSON.parse(saved) : DEFAULT_AFFILIATE_CONFIG;
    } catch {
      return DEFAULT_AFFILIATE_CONFIG;
    }
  });

  // Watchlist State with Persistence
  const [watchlist, setWatchlist] = useState<Movie[]>(() =>
    parseStoredWatchlist(localStorage.getItem(WATCHLIST_STORAGE_KEY)),
  );

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    const syncWatchlist = (event: StorageEvent) => {
      if (event.key === WATCHLIST_STORAGE_KEY) {
        setWatchlist(parseStoredWatchlist(event.newValue));
      }
    };

    window.addEventListener('storage', syncWatchlist);
    return () => window.removeEventListener('storage', syncWatchlist);
  }, []);

  const toggleBookmark = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      if (exists) {
        showToast(`Removed "${movie.title}" from Watchlist`);
        return prev.filter((m) => m.id !== movie.id);
      } else {
        showToast(`Added "${movie.title}" to Watchlist!`);
        return [...prev, movie];
      }
    });
  }, [showToast]);

  // Live TMDB Search Trigger with Debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setTmdbResults([]);
      setIsSearchingTMDB(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingTMDB(true);
      try {
        const results = await searchTMDB(searchQuery, controller.signal);
        if (!controller.signal.aborted) setTmdbResults(results);
      } catch {
        // Keep local catalog results available when live search is unavailable.
        if (!controller.signal.aborted) setTmdbResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearchingTMDB(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const prepareCatalogMovie = useCallback((movie: Movie) => {
    const uniquePlatforms = [
      ...new Map((movie.streamingPlatforms || []).map((platform) => [platform.id, platform])).values(),
    ];

    return normalizeMovieClassification({
      ...movie,
      title: normalizeVisibleText(movie.title),
      description: normalizeVisibleText(movie.description),
      director: normalizeVisibleText(movie.director),
      cast: movie.cast.map(normalizeVisibleText),
      streamingPlatforms: uniquePlatforms.map((platform) => {
        const canonicalProvider = PROVIDER_METADATA.get(platform.id);
        return {
          ...platform,
          name: canonicalProvider?.name ?? platform.name,
          logo: canonicalProvider?.logo ?? platform.logo,
          color: canonicalProvider?.color ?? platform.color,
          affiliateUrl: generateAffiliateUrl(platform.affiliateUrl, platform.id, affiliateConfig),
        };
      }),
    });
  }, [affiliateConfig]);

  const canonicalCatalog = useMemo(
    () => catalog.map(prepareCatalogMovie),
    [catalog, prepareCatalogMovie],
  );

  // Combined canonical catalog with optional live search results.
  const fullCatalog = useMemo(() => {
    if (!searchQuery.trim()) return canonicalCatalog;

    const localMatches = smartSearchMovies(canonicalCatalog, searchQuery);
    if (tmdbResults.length === 0) return localMatches;

    const canonicalTMDBResults = smartSearchMovies(
      tmdbResults.map(prepareCatalogMovie),
      searchQuery,
    );
    const existingTitles = new Set(canonicalTMDBResults.map((movie) => movie.title.toLowerCase()));
    const uniqueLocalMatches = localMatches.filter((movie) => !existingTitles.has(movie.title.toLowerCase()));
    return [...canonicalTMDBResults, ...uniqueLocalMatches];
  }, [canonicalCatalog, tmdbResults, searchQuery, prepareCatalogMovie]);

  const filterCounts = useMemo(() => getCatalogFilterCounts(fullCatalog), [fullCatalog]);

  // Filtered Movies for Display Grid
  const filteredMovies = useMemo(() => {
    let providerIds: string[] | undefined;
    if (selectedProviders.length > 0) {
      if (selectedProviders.includes('my_services')) {
        try {
          const saved = localStorage.getItem('streamflicker_my_services');
          const myServices = saved ? JSON.parse(saved) : [];
          providerIds = Array.isArray(myServices)
            ? myServices.filter((provider): provider is string => typeof provider === 'string')
            : [];
        } catch {
          providerIds = [];
        }
      } else {
        providerIds = selectedProviders;
      }
    }

    const result = applyCatalogFilters(fullCatalog, {
      era: selectedEra,
      genre: selectedGenre,
      tag: selectedTag,
      providerIds,
    });

    // Keep the catalog's score-based ordering while using canonical classifications.
    return [...result]
      .filter((movie) => matchesDiscoveryMode(movie, discoveryMode))
      .filter((movie) => matchesOccasion(movie, occasion))
      .sort((a, b) => b.score - a.score || b.year - a.year);
  }, [fullCatalog, selectedGenre, selectedEra, selectedTag, selectedProviders, discoveryMode, occasion]);

  // Suggestions must respect the same filters as the visible results. This
  // prevents a keyboard selection from opening a title that the current
  // family, date-night, quick-watch, genre, or provider filters exclude.
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filteredMovies;
  }, [filteredMovies, searchQuery]);

  // Recent high-scoring titles from the local catalog.
  const recentCatalogHighlights = useMemo(() => {
    return fullCatalog.filter((m) => m.year >= 2022 && m.score >= 9.0).slice(0, 10);
  }, [fullCatalog]);

  // Compact Top 10 Premier Movies Divided by Genre for Homepage Rows
  const topActionMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Action')).slice(0, 10), [fullCatalog]);
  const topHorrorMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Horror')).slice(0, 10), [fullCatalog]);
  const topSciFiMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Sci-Fi')).slice(0, 10), [fullCatalog]);
  const topThrillerMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Thriller')).slice(0, 10), [fullCatalog]);
  const topComedyMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Comedy')).slice(0, 10), [fullCatalog]);
  const topDramaMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Drama')).slice(0, 10), [fullCatalog]);
  const topDocumentaryMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Documentary')).slice(0, 10), [fullCatalog]);
  const topAnimationMovies = useMemo(() => fullCatalog.filter((m) => m.genre.includes('Animation')).slice(0, 10), [fullCatalog]);

  // Spotlight Hero Movies
  const spotlightMovies = useMemo(() => {
    const featured = fullCatalog.filter((m) => m.featured || m.trending);
    return featured.length > 0 ? featured : fullCatalog.length > 0 ? [fullCatalog[0]] : [];
  }, [fullCatalog]);

  const modalHistoryEntryRef = useRef(false);

  const openTrailer = useCallback((movie: Movie) => {
    const url = new URL(window.location.href);
    const currentMovieId = url.searchParams.get('movie');
    url.searchParams.set('movie', movie.id);
    if (currentMovieId) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
      modalHistoryEntryRef.current = true;
    }
    setActiveTrailerMovie(movie);
  }, []);

  const closeTrailer = useCallback(() => {
    if (modalHistoryEntryRef.current && new URL(window.location.href).searchParams.has('movie')) {
      modalHistoryEntryRef.current = false;
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('movie');
    window.history.replaceState(null, '', url);
    setActiveTrailerMovie(null);
  }, []);

  useEffect(() => {
    const syncMovieFromUrl = () => {
      const movieId = new URL(window.location.href).searchParams.get('movie');
      if (!movieId) {
        setActiveTrailerMovie(null);
        return;
      }

      const movie = fullCatalog.find((item) => item.id === movieId);
      if (movie) setActiveTrailerMovie(movie);
    };

    syncMovieFromUrl();
    window.addEventListener('popstate', syncMovieFromUrl);
    return () => window.removeEventListener('popstate', syncMovieFromUrl);
  }, [fullCatalog]);

  const handleNextTrailer = () => {
    if (!activeTrailerMovie) return;
    const candidates = filteredMovies.length > 0 ? filteredMovies : fullCatalog;
    if (candidates.length === 0) return;
    const currentIndex = candidates.findIndex((m) => m.id === activeTrailerMovie.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % candidates.length : 0;
    openTrailer(candidates[nextIndex]);
  };

  const isBookmarked = (movieId: string) => watchlist.some((m) => m.id === movieId);

  // Pagination Limit for Main Grid (prevents infinite page scroll)
  const [displayLimit, setDisplayLimit] = useState(30);

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(30);
  }, [searchQuery, selectedGenre, selectedEra, selectedTag, selectedProviders, discoveryMode, occasion]);

  const displayedMovies = useMemo(() => {
    return filteredMovies.slice(0, displayLimit);
  }, [filteredMovies, displayLimit]);

  const isHomeView =
    !searchQuery &&
    !selectedTag &&
    selectedGenre === 'All' &&
    selectedEra === 'All' &&
    selectedProviders.length === 0 &&
    discoveryMode === 'all' &&
    occasion === 'all';

  const pageTitle = activeTrailerMovie
    ? `${activeTrailerMovie.title} | StreamFlicker`
    : selectedTag
    ? `${selectedTag.replace('#', '')} Movies | StreamFlicker`
    : selectedGenre !== 'All'
    ? `${selectedGenre} Movies | StreamFlicker`
    : discoveryMode === 'family'
    ? `Family-friendly Movies | StreamFlicker`
    : occasion !== 'all'
    ? `${occasion === 'date-night' ? 'Date Night' : 'Quick Watch'} Movies | StreamFlicker`
    : selectedEra !== 'All'
    ? `${ERA_FILTERS.find(({ id }) => id === selectedEra)?.label ?? selectedEra} Movies | StreamFlicker`
    : searchQuery
    ? `Search: "${searchQuery}" | StreamFlicker`
    : 'StreamFlicker | Movie Trailers and Streaming Discovery';
  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.search = '';
  canonicalUrl.hash = '';
  if (activeTrailerMovie) canonicalUrl.searchParams.set('movie', activeTrailerMovie.id);

  return (
    <div className="min-h-[100dvh] bg-[#070709] text-zinc-100 flex flex-col selection:bg-rose-600 selection:text-white">
      
      {/* SEO Helmet */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Find movies by title, theme, mood, family-friendly mode, date night, and streaming service. Watch trailers and save a portable shortlist." />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl.toString()} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content="Find a movie for tonight, watch trailers, and check discovery links across major streaming services." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl.toString()} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[110] -translate-y-20 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        Skip to movie discovery
      </a>

      {/* Navigation Bar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        suggestions={searchSuggestions}
        onSelectSuggestion={openTrailer}
        watchlistCount={watchlist.length}
        onOpenWatchlist={() => setShowWatchlist(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenLegal={() => setLegalTab('affiliate')}
        onGoHome={() => {
          setSearchQuery('');
          setSelectedGenre('All');
          setSelectedEra('All');
          setSelectedTag(null);
          setSelectedProviders([]);
          setDiscoveryMode('all');
          setOccasion('all');
        }}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onSignOut={() => supabase.auth.signOut()}
      />

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl border border-rose-400/40 flex items-center gap-2"
        >
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Page Container */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16 flex-1 w-full">
        {catalogUsingFallback && catalogStatus === 'ready' && (
          <div role="status" className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/80">
            The catalog could not be refreshed, so your saved Watchlist is shown as a local fallback. <button className="font-bold text-amber-300 underline" onClick={() => setCatalogReloadToken((value) => value + 1)}>Retry catalog</button>
          </div>
        )}
        {catalogStatus === 'loading' && (
          <section
            role="status"
            aria-live="polite"
            className="my-6 h-[500px] sm:h-[560px] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden"
          >
            <span className="sr-only">Loading the movie catalog</span>
            <div className="h-full p-6 sm:p-10 flex flex-col justify-end gap-4">
              <div className="skeleton-loader h-6 w-32 rounded-lg" />
              <div className="skeleton-loader h-14 w-3/4 max-w-lg rounded-xl" />
              <div className="skeleton-loader h-5 w-full max-w-2xl rounded-lg" />
              <div className="skeleton-loader h-12 w-44 rounded-xl" />
            </div>
          </section>
        )}

        {catalogStatus === 'error' && (
          <section role="alert" className="glass-panel my-8 rounded-2xl p-8 text-center">
            <Film size={36} className="mx-auto mb-3 text-rose-400" />
            <h1 className="font-display text-2xl font-bold text-white">The catalog could not be loaded</h1>
            <p className="mt-2 text-sm text-zinc-400">The local catalog is temporarily unavailable. Retry now; your saved Watchlist remains in this browser.</p>
            <button
              onClick={() => setCatalogReloadToken((value) => value + 1)}
              className="mt-5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-500 active:scale-[0.98]"
            >
              Retry catalog
            </button>
          </section>
        )}
        
        {/* Spotlight Hero Carousel */}
        {catalogStatus === 'ready' && isHomeView && spotlightMovies.length > 0 && (
          <HeroCarousel
            movies={spotlightMovies}
            onWatchTrailer={openTrailer}
            isBookmarked={isBookmarked}
            onToggleBookmark={toggleBookmark}
          />
        )}

        {/* Filter Bar */}
        {catalogStatus === 'ready' && <FilterBar
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          selectedEra={selectedEra}
          setSelectedEra={setSelectedEra}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          selectedProviders={selectedProviders}
          setSelectedProviders={setSelectedProviders}
          counts={filterCounts}
          discoveryMode={discoveryMode}
          setDiscoveryMode={setDiscoveryMode}
          occasion={occasion}
          setOccasion={setOccasion}
        />}

        {/* Netflix-Style Category Rows (Top 10 Streaming & Genre Showcase) */}
        {catalogStatus === 'ready' && isHomeView && (
          <div className="space-y-4 mb-12">
            <MovieRow
              title="Recent catalog highlights"
              subtitle="High-scoring recent titles selected from the local catalog"
              icon={<Award className="text-rose-400" size={24} />}
              movies={recentCatalogHighlights}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Action Crowd-Pleasers"
              subtitle="High-octane adventures, martial arts, and explosive action"
              icon={<Flame className="text-rose-500" size={24} />}
              movies={topActionMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Horror Night"
              subtitle="Zombie outbreaks, slashers, monsters, and supernatural scares"
              icon={<Skull className="text-rose-500" size={24} />}
              movies={topHorrorMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Sci-Fi & Space Adventures"
              subtitle="Cyberpunk futures, alien encounters, and deep-space exploration"
              icon={<Sparkles className="text-rose-400" size={24} />}
              movies={topSciFiMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Edge-of-Your-Seat Thrillers"
              subtitle="Mind games, serial-killer hunts, conspiracies, and suspense"
              icon={<Ghost className="text-rose-400" size={24} />}
              movies={topThrillerMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Comedy & Dark Humor"
              subtitle="Comedies, satire, parodies, and macabre laughs"
              icon={<Film className="text-rose-400" size={24} />}
              movies={topComedyMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Drama Spotlight"
              subtitle="Character studies, family stories, relationships, and emotional journeys"
              icon={<Award className="text-rose-400" size={24} />}
              movies={topDramaMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Documentary Deep Dives"
              subtitle="Nonfiction stories, archival explorations, interviews, and behind-the-scenes films"
              icon={<Clapperboard className="text-rose-400" size={24} />}
              movies={topDocumentaryMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Animation Station"
              subtitle="Animated, anime, and stop-motion stories from across the catalog"
              icon={<Sparkles className="text-rose-400" size={24} />}
              movies={topAnimationMovies}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />
          </div>
        )}

        {/* Full Movie Catalog Grid (Shown when searching or applying filters) */}
        {catalogStatus === 'ready' && !isHomeView && (
          <>
            <div className="flex items-center justify-between my-6">
              <div>
                <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight flex items-center gap-2">
                  <Clapperboard className="text-rose-500" size={26} />
                  {selectedTag
                    ? `${selectedTag} Movies`
                    : selectedGenre !== 'All'
                    ? `${selectedGenre} Movies`
                    : discoveryMode === 'family'
                    ? 'Family-friendly Movies'
                    : occasion === 'date-night'
                    ? 'Date-night Movies'
                    : occasion === 'quick-watch'
                    ? 'Quick-watch Movies'
                    : selectedProviders.length > 0
                    ? `Streaming Movies`
                    : selectedEra !== 'All'
                    ? `${ERA_FILTERS.find(({ id }) => id === selectedEra)?.label ?? selectedEra} Movies`
                    : searchQuery
                    ? `Results for "${searchQuery.length > 80 ? `${searchQuery.slice(0, 77)}...` : searchQuery}"`
                    : 'Filtered Catalog'}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5" aria-live="polite">
                  {isSearchingTMDB
                    ? 'Checking optional live search results...'
                    : `Showing ${displayedMovies.length} of ${filteredMovies.length} top-rated title${filteredMovies.length === 1 ? '' : 's'}`}
                </p>
                <p className="text-[11px] text-zinc-500 mt-2 max-w-xl">
                  Streaming availability is for discovery and can change. Confirm current availability and pricing with the service before watching.
                </p>
                {(getSearchReason(filteredMovies[0], searchQuery) || discoveryMode === 'family' || occasion !== 'all') && (
                  <p className="text-[11px] text-emerald-200/75 mt-2 max-w-xl">
                    {getSearchReason(filteredMovies[0], searchQuery)
                      ?? (discoveryMode === 'family'
                        ? 'Family-friendly mode filters out R-rated titles and high-risk themes.'
                        : occasion === 'date-night'
                        ? 'Date-night mode prioritizes romance, comedy, and conversation-friendly drama.'
                        : 'Quick-watch mode prioritizes titles around 110 minutes or less.')}
                  </p>
                )}
              </div>
            </div>

            {/* Movies Grid */}
            {filteredMovies.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {displayedMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onWatchTrailer={openTrailer}
                      isBookmarked={isBookmarked(movie.id)}
                      onToggleBookmark={() => toggleBookmark(movie)}
                      onShare={(m) => setShareMovie(m)}
                      onSetAlert={(m) => setAlertMovie(m)}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {displayLimit < filteredMovies.length && (
                  <div className="flex justify-center mt-12 mb-6">
                    <button
                      onClick={() => setDisplayLimit((prev) => prev + 30)}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-8 py-3.5 rounded-2xl border border-zinc-700 hover:border-zinc-500 shadow-xl transition-all flex items-center gap-2 text-sm"
                    >
                      <span>Load More Movies ({filteredMovies.length - displayLimit} remaining)</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-panel rounded-3xl p-12 text-center my-12 max-w-xl mx-auto border border-zinc-800">
                <Film size={48} className="mx-auto mb-4 text-zinc-600 animate-bounce" />
                <h3 className="font-display font-bold text-xl text-white mb-2">No movies match your filters</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  {searchQuery
                    ? 'Try a broader title, actor, theme, or occasion, or clear the search.'
                    : discoveryMode === 'family'
                    ? 'Try Everything mode, or confirm the provider rating before choosing a family title.'
                    : occasion === 'date-night'
                    ? 'Try Everything mode or a broader genre to find more date-night options.'
                    : occasion === 'quick-watch'
                    ? 'Try Everything mode if you can spend a little longer with your movie.'
                    : 'Try resetting a filter to discover more titles.'}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre('All');
                    setSelectedEra('All');
                    setSelectedTag(null);
                    setSelectedProviders([]);
                    setDiscoveryMode('all');
                    setOccasion('all');
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-lg shadow-rose-600/30 transition-all"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#070709] py-10 mt-auto safe-area-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs text-zinc-500">
          <div>
            <span className="font-display font-bold text-zinc-300 text-sm block mb-1">
              StreamFlicker
            </span>
            <p>© {new Date().getFullYear()} StreamFlicker. Movie trailers and streaming discovery.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-zinc-400 font-medium">
            <button
              onClick={() => setLegalTab('terms')}
              className="min-h-11 hover:text-white focus-visible:text-white transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setLegalTab('privacy')}
              className="min-h-11 hover:text-white focus-visible:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setLegalTab('affiliate')}
              className="min-h-11 hover:text-white focus-visible:text-white transition-colors"
            >
              Affiliate Disclosure
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Open footer Preferences and integrations"
              className="min-h-11 hover:text-white focus-visible:text-white transition-colors"
            >
              Preferences & integrations
            </button>
          </div>
        </div>
      </footer>

      {/* Trailer Video Player Modal */}
      {activeTrailerMovie && (
        <TrailerModal
          movie={activeTrailerMovie}
          onClose={closeTrailer}
          onNextTrailer={handleNextTrailer}
          isBookmarked={isBookmarked(activeTrailerMovie.id)}
          onToggleBookmark={toggleBookmark}
        />
      )}

      {/* Watchlist Drawer/Modal */}
      {showWatchlist && (
        <WatchlistModal
          watchlist={watchlist}
          onClose={() => setShowWatchlist(false)}
          onWatchTrailer={openTrailer}
          onRemove={toggleBookmark}
        />
      )}

      {/* Share Modal */}
      {shareMovie && (
        <ShareModal
          movie={shareMovie}
          onClose={() => setShareMovie(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={(_key, config) => setAffiliateConfig(config)}
        />
      )}

      {/* Legal & Compliance Modal */}
      {legalTab && (
        <LegalModal
          initialTab={legalTab}
          onClose={() => setLegalTab(null)}
        />
      )}

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthSuccess={() => setShowAuth(false)}
        />
      )}

      {/* Alerts Modal */}
      {alertMovie && (
        <AlertsModal
          movie={alertMovie}
          user={user}
          onClose={() => setAlertMovie(null)}
          onOpenAuth={() => {
            setAlertMovie(null);
            setShowAuth(true);
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <HelmetProvider>
      <AppContent />
    </HelmetProvider>
  );
}

export default App;
