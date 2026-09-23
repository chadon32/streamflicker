import { lazy, Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { STREAMING_PROVIDERS, type Movie } from './data/catalog';
import { searchTMDB } from './services/tmdbApi';
import { smartSearchMovies } from './services/smartSearch';
import {
  applyCatalogFilters,
  ERA_FILTERS,
  getCatalogFilterCounts,
  getMicroTagLabel,
  normalizeMovieClassification,
  type EraFilterId,
} from './services/catalogClassification';
import {
  getSearchReason,
  getDateNightPriority,
  isDateNightFriendly,
  isFamilyFriendly,
  isQuickWatch,
  matchesDiscoveryMode,
  matchesOccasion,
  type DiscoveryMode,
  type OccasionFilter,
} from './services/discovery';
import { generateAffiliateUrl, getAffiliateConfig, type AffiliateConfig } from './services/affiliate';
import { Navbar } from './components/Navbar';
import { HeroCarousel } from './components/HeroCarousel';
import { FilterBar } from './components/FilterBar';
import { MovieCard } from './components/MovieCard';
import { MovieRow } from './components/MovieRow';
import { GoogleAd } from './components/GoogleAd';
import { MonetizationPanel } from './components/MonetizationPanel';
import { SponsorSpotlight } from './components/SponsorSpotlight';
import { Capacitor } from '@capacitor/core';
import { Film, Clapperboard, Sparkles, Award, Heart, Clock3, UsersRound, ArrowRight, LayoutGrid } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabaseConfig';
import { getPublicMonetizationConfig } from './services/monetization';
import { getValidatedYouTubeTrailerId } from './services/trailer';
import { mergeLiveAndLocalMovies, mergeLiveMoviePages } from './services/searchCatalog';
import { openNativeMovieNight } from './services/native';
import { getValidatedCatalog, getValidatedCatalogMetadata } from './services/catalogQuality';
import { PageSeo } from './seo/PageSeo';
import { hasPrivateQuery, SEO_PAGES } from './seo/pages';
import { DiscoveryExplainer } from './components/DiscoveryExplainer';
import {
  getLegacyWatchlist,
  getWatchlistStorageKey,
  importLegacyWatchlistToGuest,
  importLegacyWatchlistToUser,
  loadWatchlistForUser,
  parseStoredWatchlist,
  saveWatchlistForUser,
} from './services/watchlistStorage';
import type { TMDBPagination, TMDBExpandedCollection } from './services/tmdbApi';
import type { User } from '@supabase/supabase-js';

const TrailerModal = lazy(() => import('./components/TrailerModal').then(({ TrailerModal }) => ({ default: TrailerModal })));
const ShareModal = lazy(() => import('./components/ShareModal').then(({ ShareModal }) => ({ default: ShareModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(({ SettingsModal }) => ({ default: SettingsModal })));
const AccountSettingsModal = lazy(() => import('./components/AccountSettingsModal').then(({ AccountSettingsModal }) => ({ default: AccountSettingsModal })));
const LegalModal = lazy(() => import('./components/LegalModal').then(({ LegalModal }) => ({ default: LegalModal })));
const WatchlistModal = lazy(() => import('./components/WatchlistModal').then(({ WatchlistModal }) => ({ default: WatchlistModal })));
const MovieNightPlanner = lazy(() => import('./components/MovieNightPlanner').then(({ MovieNightPlanner }) => ({ default: MovieNightPlanner })));
const AuthModal = lazy(() => import('./components/AuthModal').then(({ AuthModal }) => ({ default: AuthModal })));
const AlertsModal = lazy(() => import('./components/AlertsModal').then(({ AlertsModal }) => ({ default: AlertsModal })));
const BusinessPage = lazy(() => import('./components/BusinessPage').then(({ BusinessPage }) => ({ default: BusinessPage })));
const MovieNightGuide = lazy(() => import('./components/MovieNightGuide').then(({ MovieNightGuide }) => ({ default: MovieNightGuide })));
type LegalTab = 'terms' | 'privacy' | 'affiliate' | 'dmca';

const PROVIDER_METADATA = new Map<string, (typeof STREAMING_PROVIDERS)[number]>(
  STREAMING_PROVIDERS.map((provider) => [provider.id, provider]),
);

function normalizeVisibleText(value: string) {
  return value.replace(/[\u2013\u2014]/g, '-');
}

function sortCatalogQuality(movies: Movie[]): Movie[] {
  return [...movies].sort((left, right) => {
    const leftRank = getValidatedCatalogMetadata(left.id)?.curationRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = getValidatedCatalogMetadata(right.id)?.curationRank ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || right.year - left.year || left.title.localeCompare(right.title);
  });
}

function sortDateNightQuality(movies: Movie[]): Movie[] {
  return [...movies].sort((left, right) => {
    const leftRank = getValidatedCatalogMetadata(left.id)?.curationRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = getValidatedCatalogMetadata(right.id)?.curationRank ?? Number.MAX_SAFE_INTEGER;
    return getDateNightPriority(right) - getDateNightPriority(left)
      || leftRank - rightRank
      || right.year - left.year
      || left.title.localeCompare(right.title);
  });
}

export function AppContent() {
  const [pagePath, setPagePath] = useState(() => window.location.pathname);
  const [publicMonetization] = useState(getPublicMonetizationConfig);
  const showWebMonetizationLinks = !Capacitor.isNativePlatform();
  const authEnabled = isSupabaseConfigured && !Capacitor.isNativePlatform();
  const [authReady, setAuthReady] = useState(!authEnabled);

  useEffect(() => {
    const syncPagePath = () => {
      setPagePath(window.location.pathname);
      setSearchQueryState(new URLSearchParams(window.location.search).get('q')?.slice(0, 200) || '');
    };
    window.addEventListener('popstate', syncPagePath);
    return () => window.removeEventListener('popstate', syncPagePath);
  }, []);

  const [catalog, setCatalog] = useState<Movie[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogUsingFallback, setCatalogUsingFallback] = useState(false);
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);
  const [searchQuery, setSearchQueryState] = useState(() => new URLSearchParams(window.location.search).get('q')?.slice(0, 200) || '');
  const setSearchQuery = useCallback((query: string) => {
    const boundedQuery = query.slice(0, 200);
    const url = new URL(window.location.href);
    if (boundedQuery) url.searchParams.set('q', boundedQuery);
    else url.searchParams.delete('q');
    try {
      window.history.replaceState(window.history.state, '', url);
    } catch {
      // Some browsers rate-limit history writes during rapid typing. Search
      // must still work even if the shareable URL cannot update this time.
    }
    setSearchQueryState(boundedQuery);
  }, []);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedEra, setSelectedEra] = useState<EraFilterId>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('all');
  const [occasion, setOccasion] = useState<OccasionFilter>('all');
  const [browseCatalog, setBrowseCatalog] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const activeWatchlistStorageKey = authReady ? getWatchlistStorageKey(user?.id) : '';
  const activeWatchlistStorageKeyRef = useRef(activeWatchlistStorageKey);
  activeWatchlistStorageKeyRef.current = activeWatchlistStorageKey;

  const startDiscovery = (choice: 'home' | 'all' | 'family' | 'date-night' | 'quick-watch' | 'zombies') => {
    setSearchQuery('');
    setSelectedGenre('All');
    setSelectedEra('All');
    setSelectedTag(choice === 'zombies' ? '#ZombieOutbreak' : null);
    setSelectedProviders([]);
    setDiscoveryMode(choice === 'family' ? 'family' : 'all');
    setOccasion(choice === 'date-night' || choice === 'quick-watch' ? choice : 'all');
    setBrowseCatalog(choice !== 'home');
  };
  
  // Live TMDB Results State
  const [tmdbResults, setTmdbResults] = useState<Movie[]>([]);
  const [isSearchingTMDB, setIsSearchingTMDB] = useState(false);
  const [liveSearchStatus, setLiveSearchStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [tmdbPagination, setTmdbPagination] = useState<TMDBPagination | null>(null);
  const [tmdbExpandedCollections, setTmdbExpandedCollections] = useState<TMDBExpandedCollection[]>([]);
  const [tmdbWarnings, setTmdbWarnings] = useState<string[]>([]);
  const [tmdbCheckedAt, setTmdbCheckedAt] = useState<string | null>(null);
  const [tmdbRegion, setTmdbRegion] = useState<string | null>(null);
  const [isLoadingMoreLive, setIsLoadingMoreLive] = useState(false);
  const liveRequestIdRef = useRef(0);
  const liveMoreAbortRef = useRef<AbortController | null>(null);

  // Modals State
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);
  const [shareMovie, setShareMovie] = useState<Movie | null>(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showMovieNight, setShowMovieNight] = useState(false);
  const plannerLinkHandled = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [alertMovie, setAlertMovie] = useState<Movie | null>(null);

  const handleOpenMovieNight = useCallback(async () => {
    // iOS/iPadOS gets an app-owned native workflow that remains useful when
    // the network is unavailable. The web planner remains the fallback for
    // browsers and for older native builds while the plugin is unavailable.
    if (Capacitor.isNativePlatform() && await openNativeMovieNight()) return;
    setShowMovieNight(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setCatalogStatus('loading');
    import('./data/generatedMovies')
      .then(({ SAMPLE_MOVIES }) => {
        if (cancelled) return;
        setCatalog(SAMPLE_MOVIES);
        setCatalogUsingFallback(false);
        setCatalogStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // A previously saved Watchlist is a useful local fallback while the catalog chunk is retried.
        const fallback = parseStoredWatchlist(localStorage.getItem(activeWatchlistStorageKeyRef.current));
        if (fallback.length > 0) {
          setCatalog(fallback.map((movie) => ({ ...movie, recordSource: 'watchlist-fallback' as const })));
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
  useEffect(() => {
    // Native builds use an offline-first guest mode. This keeps the app's
    // core planner and watchlist reliable even when an account service is
    // unavailable, and avoids exposing a sign-up control that cannot work in
    // a release build without a reachable Supabase project.
    if (!authEnabled) return;

    let disposed = false;
    let subscription: { unsubscribe: () => void } | null = null;

    void import('./lib/supabase').then(({ supabase }) => {
      if (disposed) return;

      // Fetch initial user after the shell has rendered. Supabase is only
      // needed for account features, so keep its client out of the initial JS.
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!disposed) {
          setUser(user);
          setAuthReady(true);
        }
      }).catch(() => {
        if (!disposed) {
          setUser(null);
          setAuthReady(true);
        }
      });

      // Listen for auth changes
      const authState = supabase.auth.onAuthStateChange((event, session) => {
        if (!disposed) {
          setUser(session?.user ?? null);
          if (event !== 'INITIAL_SESSION') setAuthReady(true);
        }
      });
      subscription = authState.data.subscription;
    }).catch(() => {
      if (!disposed) {
        setUser(null);
        setAuthReady(true);
      }
    });

    return () => {
      disposed = true;
      subscription?.unsubscribe();
    };
  }, [authEnabled]);

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

  const handleDeleteAccount = useCallback(async () => {
    const { deleteCurrentAccount } = await import('./services/account');
    await deleteCurrentAccount();
    setShowAccountSettings(false);
    showToast('Your account was permanently deleted.');
  }, [showToast]);

  const handleImportLegacyWatchlist = useCallback(() => {
    const imported = user
      ? importLegacyWatchlistToUser(user.id)
      : importLegacyWatchlistToGuest();
    setWatchlist(imported);
    showToast(
      user
        ? `Imported ${imported.length} saved movie${imported.length === 1 ? '' : 's'} to this account.`
        : `Imported ${imported.length} saved movie${imported.length === 1 ? '' : 's'} to this device.`,
    );
  }, [showToast, user]);

  const handleSignOut = useCallback(() => {
    void import('./lib/supabase').then(({ supabase }) => supabase.auth.signOut());
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  // Affiliate Config State
  const [affiliateConfig, setAffiliateConfig] = useState<AffiliateConfig>(() => {
    return getAffiliateConfig();
  });

  // Watchlist State with Persistence
  const [watchlist, setWatchlist] = useState<Movie[]>(() =>
    authReady ? loadWatchlistForUser(user?.id) : [],
  );
  const [watchlistStorageKey, setWatchlistStorageKey] = useState(activeWatchlistStorageKey);

  // Open a guide's planner link only after session/storage initialization,
  // which intentionally closes dialogs when the account namespace changes.
  useEffect(() => {
    if (!authReady || catalogStatus !== 'ready' || watchlistStorageKey !== activeWatchlistStorageKey || plannerLinkHandled.current) return;
    plannerLinkHandled.current = true;
    if (!Capacitor.isNativePlatform() && new URLSearchParams(window.location.search).get('plan') === '1') setShowMovieNight(true);
  }, [authReady, catalogStatus, watchlistStorageKey, activeWatchlistStorageKey]);

  useEffect(() => {
    if (!authReady) return;
    if (watchlistStorageKey !== activeWatchlistStorageKey) {
      setWatchlistStorageKey(activeWatchlistStorageKey);
      setWatchlist(loadWatchlistForUser(user?.id));
      setActiveTrailerMovie(null);
      setShareMovie(null);
      setShowWatchlist(false);
      setShowMovieNight(false);
      setShowSettings(false);
      setShowAccountSettings(false);
      setShowAuth(false);
      setAlertMovie(null);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToastMessage(null);
      return;
    }
    saveWatchlistForUser(user?.id, watchlist);
  }, [activeWatchlistStorageKey, authReady, user?.id, watchlistStorageKey, watchlist]);

  useEffect(() => {
    const syncWatchlist = (event: StorageEvent) => {
      if (event.key === watchlistStorageKey) {
        setWatchlist(parseStoredWatchlist(event.newValue));
      }
    };

    window.addEventListener('storage', syncWatchlist);
    return () => window.removeEventListener('storage', syncWatchlist);
  }, [watchlistStorageKey]);

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
    const requestId = liveRequestIdRef.current + 1;
    liveRequestIdRef.current = requestId;
    liveMoreAbortRef.current?.abort();
    liveMoreAbortRef.current = null;
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setTmdbResults([]);
      setIsSearchingTMDB(false);
      setLiveSearchStatus('idle');
      setTmdbPagination(null);
      setTmdbExpandedCollections([]);
      setTmdbWarnings([]);
      setTmdbCheckedAt(null);
      setTmdbRegion(null);
      setIsLoadingMoreLive(false);
      return;
    }

    const controller = new AbortController();
    setTmdbResults([]);
    setTmdbPagination(null);
    setTmdbExpandedCollections([]);
    setTmdbWarnings([]);
    setTmdbCheckedAt(null);
    setTmdbRegion(null);
    const timer = window.setTimeout(async () => {
      setIsSearchingTMDB(true);
      setLiveSearchStatus('checking');
      try {
        const result = await searchTMDB(trimmedQuery, controller.signal, 1);
        if (!controller.signal.aborted && liveRequestIdRef.current === requestId) {
          setTmdbResults(result.movies);
          setLiveSearchStatus(result.status);
          setTmdbPagination(result.pagination ?? null);
          setTmdbExpandedCollections(result.expandedCollections ?? []);
          setTmdbWarnings(result.warnings ?? []);
          setTmdbCheckedAt(result.checkedAt ?? null);
          setTmdbRegion(result.region ?? null);
        }
      } catch {
        // Keep local catalog results available when live search is unavailable.
        if (!controller.signal.aborted && liveRequestIdRef.current === requestId) {
          setTmdbResults([]);
          setLiveSearchStatus('unavailable');
          setTmdbPagination(null);
          setTmdbWarnings(['Live catalog search is temporarily unavailable.']);
        }
      } finally {
        if (!controller.signal.aborted && liveRequestIdRef.current === requestId) setIsSearchingTMDB(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const loadMoreLiveResults = useCallback(async () => {
    if (!searchQuery.trim() || !tmdbPagination?.hasMore || isLoadingMoreLive) return;
    const requestId = liveRequestIdRef.current;
    const queryAtRequest = searchQuery;
    const nextPage = tmdbPagination.page + 1;
    const controller = new AbortController();
    liveMoreAbortRef.current?.abort();
    liveMoreAbortRef.current = controller;
    setIsLoadingMoreLive(true);
    try {
      const result = await searchTMDB(queryAtRequest, controller.signal, nextPage);
      if (controller.signal.aborted || liveRequestIdRef.current !== requestId || searchQuery !== queryAtRequest) return;
      if (result.status !== 'available') {
        setTmdbWarnings((current) => [...new Set([...current, 'More live results could not be loaded right now.'])]);
        return;
      }
      setTmdbResults((current) => mergeLiveMoviePages(current, result.movies));
      setTmdbPagination(result.pagination ?? null);
      setTmdbWarnings((current) => [...new Set([...current, ...(result.warnings ?? [])])]);
      setTmdbCheckedAt(result.checkedAt ?? tmdbCheckedAt);
      setTmdbRegion(result.region ?? tmdbRegion);
    } catch {
      if (!controller.signal.aborted && liveRequestIdRef.current === requestId) {
        setTmdbWarnings((current) => [...new Set([...current, 'More live results could not be loaded right now.'])]);
      }
    } finally {
      if (!controller.signal.aborted && liveRequestIdRef.current === requestId) setIsLoadingMoreLive(false);
    }
  }, [isLoadingMoreLive, searchQuery, tmdbCheckedAt, tmdbPagination, tmdbRegion]);

  const prepareLiveMovie = useCallback((movie: Movie) => {
    const hasVerifiedAvailability = movie.availability?.status === 'verified';
    const uniquePlatforms = hasVerifiedAvailability
      ? [
          ...new Map(
            (movie.streamingPlatforms || [])
              .filter((platform) => platform.availabilityStatus === 'verified')
              .map((platform) => [`${platform.id}-${platform.type}`, platform]),
          ).values(),
        ]
      : [];

      return normalizeMovieClassification({
        ...movie,
        recordSource: 'tmdb-live' as const,
        title: normalizeVisibleText(movie.title),
      description: normalizeVisibleText(movie.description),
      director: normalizeVisibleText(movie.director),
      cast: movie.cast.map(normalizeVisibleText),
      youtubeTrailerId: getValidatedYouTubeTrailerId(movie.youtubeTrailerId),
      availability: movie.availability ?? {
        status: 'discovery',
        source: 'bundled',
        region: 'US',
      },
      streamingPlatforms: uniquePlatforms.map((platform) => {
        const canonicalProvider = PROVIDER_METADATA.get(platform.id);
        return {
          ...platform,
          name: canonicalProvider?.name ?? platform.name,
          logo: canonicalProvider?.logo ?? platform.logo,
          color: canonicalProvider?.color ?? platform.color,
          affiliateUrl: platform.source === 'tmdb'
            ? platform.affiliateUrl
            : generateAffiliateUrl(platform.affiliateUrl, platform.id, affiliateConfig),
        };
      }),
    });
  }, [affiliateConfig]);

  // Bundled movies are preclassified and compacted during the build. Only
  // live TMDB records need the runtime normalization and provider pass.
  const canonicalCatalog = catalog;
  // A Watchlist fallback remains available for local search/display recovery,
  // but it is never eligible for trusted featured, business, or planner
  // surfaces even if a row happens to match a curated id and metadata.
  const validatedCatalog = useMemo(
    () => catalogUsingFallback ? [] : getValidatedCatalog(canonicalCatalog),
    [canonicalCatalog, catalogUsingFallback],
  );

  // Combined canonical catalog with optional live search results.
  const fullCatalog = useMemo(() => {
    if (!searchQuery.trim()) return canonicalCatalog;

    const localMatches = smartSearchMovies(canonicalCatalog, searchQuery);
    if (tmdbResults.length === 0) return localMatches;

    const liveMatches = smartSearchMovies(
      tmdbResults.map(prepareLiveMovie),
      searchQuery,
    );
    return mergeLiveAndLocalMovies(liveMatches, localMatches);
  }, [canonicalCatalog, tmdbResults, searchQuery, prepareLiveMovie]);

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

    const filtered = [...result]
      .filter((movie) => matchesDiscoveryMode(movie, discoveryMode))
      .filter((movie) => matchesOccasion(movie, occasion));

    // smartSearchMovies already ranks active text queries by title, alias,
    // intent, and typo relevance. Do not erase that ordering with a generic
    // score sort after applying the remaining filters.
    if (searchQuery.trim()) return filtered;
    return occasion === 'date-night' ? sortDateNightQuality(filtered) : sortCatalogQuality(filtered);
  }, [fullCatalog, selectedGenre, selectedEra, selectedTag, selectedProviders, discoveryMode, occasion, searchQuery]);

  // Suggestions must respect the same filters as the visible results. This
  // prevents a keyboard selection from opening a title that the current
  // family, date-night, quick-watch, genre, or provider filters exclude.
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filteredMovies;
  }, [filteredMovies, searchQuery]);

  // Recent titles from the offline-curated subset.
  const recentCatalogHighlights = useMemo(() => {
    return sortCatalogQuality(validatedCatalog).slice(0, 10);
  }, [validatedCatalog]);

  // Four purposeful rails keep the landing page quick to scan and avoid
  // rendering a long stack of near-duplicate genre rows before someone knows
  // what they want to watch. Genre and theme controls remain one tap away.
  // These rows are only shown on the unfiltered homepage. A text query or
  // arriving live result must not rebuild four hidden rows on every keystroke.
  const familyMovieNight = useMemo(() => sortCatalogQuality(validatedCatalog.filter(isFamilyFriendly)).slice(0, 10), [validatedCatalog]);
  const dateNightPicks = useMemo(() => sortDateNightQuality(validatedCatalog.filter(isDateNightFriendly)).slice(0, 10), [validatedCatalog]);
  const quickWatchPicks = useMemo(() => sortCatalogQuality(validatedCatalog.filter(isQuickWatch)).slice(0, 10), [validatedCatalog]);

  // Spotlight Hero Movies
  const spotlightMovies = useMemo(() => {
    const featured = validatedCatalog.filter((m) => m.featured || m.trending);
    return featured.length > 0 ? featured : validatedCatalog.slice(0, 1);
  }, [validatedCatalog]);

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
    !browseCatalog &&
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
    ? `${getMicroTagLabel(selectedTag)} Movies | StreamFlicker`
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
    : SEO_PAGES['/'].title;

  if (pagePath === '/movie-night') {
    return <><PageSeo path="/movie-night" noindex={hasPrivateQuery(window.location.search)} /><Suspense fallback={<p className="p-8">Loading movie-night guide...</p>}><MovieNightGuide /></Suspense></>;
  }

  if (pagePath === '/about' || pagePath === '/business') {
    return (
      <Suspense fallback={<div className="min-h-[100dvh] bg-[#070709]" aria-busy="true" />}>
        <PageSeo path="/about" noindex={hasPrivateQuery(window.location.search)} />
        <BusinessPage
          movies={validatedCatalog.slice(0, 8)}
          sponsorInquiryUrl={publicMonetization.sponsorInquiryUrl}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#070709] text-zinc-100 flex flex-col selection:bg-rose-600 selection:text-white">
      
      {/* SEO Helmet */}
      <PageSeo path="/" title={pageTitle} noindex={hasPrivateQuery(window.location.search)} />
      <Helmet>
        {showWebMonetizationLinks && publicMonetization.ads.enabled && (
          <meta name="google-adsense-account" content={publicMonetization.ads.clientId} />
        )}
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
        onOpenMovieNight={handleOpenMovieNight}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAccountSettings={() => setShowAccountSettings(true)}
        onOpenLegal={() => setLegalTab('affiliate')}
        onGoHome={() => startDiscovery('home')}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onSignOut={handleSignOut}
        authEnabled={authEnabled}
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
        
        {catalogStatus === 'ready' && (
          <section aria-label="Quick discovery" className="mb-5">
            {isHomeView && (
              <div className="flex flex-col gap-4 py-3 sm:py-5 md:flex-row md:items-center md:justify-between">
                 <div>
                   <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">What are we watching tonight?</h1>
                   <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">Decide in five minutes with three validated picks, then preview a trailer and check where to watch.</p>
                 </div>
                 <button type="button" onClick={handleOpenMovieNight} className="inline-flex min-h-12 w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-500">
                   <Sparkles size={18} aria-hidden="true" /> Decide in five minutes <ArrowRight size={16} aria-hidden="true" />
                 </button>
               </div>
             )}
             {isHomeView && (
               <p className="max-w-3xl rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-[11px] leading-relaxed text-emerald-100/75">
                 Featured rows and the planner use a small offline-curated subset checked 2026-09-23. Browse and search can include bundled discovery records; verify their details and current availability before watching.
               </p>
             )}
            <div className="flex flex-wrap gap-2 pt-3" aria-label="Ways to discover movies">
              <button type="button" onClick={() => startDiscovery('all')} className="discovery-shortcut">
                <LayoutGrid size={15} aria-hidden="true" /> Browse all <span className="text-zinc-400">{canonicalCatalog.length.toLocaleString()}</span>
              </button>
              <button type="button" onClick={() => startDiscovery('family')} aria-pressed={discoveryMode === 'family'} className="discovery-shortcut">
                <UsersRound size={15} aria-hidden="true" /> Family night
              </button>
              <button type="button" onClick={() => startDiscovery('date-night')} aria-pressed={occasion === 'date-night'} className="discovery-shortcut">
                <Heart size={15} aria-hidden="true" /> Date night
              </button>
              <button type="button" onClick={() => startDiscovery('quick-watch')} aria-pressed={occasion === 'quick-watch'} className="discovery-shortcut">
                <Clock3 size={15} aria-hidden="true" /> Quick watch
              </button>
              <button type="button" onClick={() => startDiscovery('zombies')} aria-pressed={selectedTag === '#ZombieOutbreak'} className="discovery-shortcut">Zombie movies</button>
            </div>
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
          resultCount={filteredMovies.length}
          discoveryMode={discoveryMode}
          setDiscoveryMode={setDiscoveryMode}
          occasion={occasion}
          setOccasion={setOccasion}
        />}

        {catalogStatus === 'ready'
          && isHomeView
          && showWebMonetizationLinks
          && publicMonetization.sponsorship && (
          <SponsorSpotlight sponsorship={publicMonetization.sponsorship} />
        )}

        {/* Purposeful discovery rows */}
        {catalogStatus === 'ready' && isHomeView && (
          <div className="space-y-4 mb-12">
            <MovieRow
              title="Top picks right now"
              subtitle="Recent curated titles for a fast first choice"
              icon={<Award className="text-rose-400" size={24} />}
              movies={recentCatalogHighlights}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Family movie night"
              subtitle="Age-conscious picks with higher-risk themes filtered out"
              icon={<UsersRound className="text-emerald-400" size={24} />}
              movies={familyMovieNight}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Date-night picks"
              subtitle="Romance and relationship-driven, conversation-friendly movies"
              icon={<Heart className="text-rose-400" size={24} />}
              movies={dateNightPicks}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            <MovieRow
              title="Quick watches"
              subtitle="Movies around 110 minutes or less when time is short"
              icon={<Clock3 className="text-amber-400" size={24} />}
              movies={quickWatchPicks}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              onShare={(m) => setShareMovie(m)}
              onSetAlert={(m) => setAlertMovie(m)}
            />

            {showWebMonetizationLinks
              && publicMonetization.ads.enabled
              && publicMonetization.ads.homeSlot && (
              <GoogleAd
                clientId={publicMonetization.ads.clientId}
                slot={publicMonetization.ads.homeSlot}
                placement="home"
              />
            )}
          </div>
        )}

        {/* Full Movie Catalog Grid (Shown when searching or applying filters) */}
        {catalogStatus === 'ready' && !isHomeView && (
          <>
            <div className="flex items-center justify-between my-6">
              <div>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight break-words">
                  <Clapperboard className="mr-2 inline-block text-rose-500" size={26} aria-hidden="true" />
                  {selectedTag
                    ? `${getMicroTagLabel(selectedTag)} Movies`
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
                    : 'Browse all movies'}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5" aria-live="polite">
                  {isSearchingTMDB
                    ? 'Checking optional live search results...'
                    : `Showing ${displayedMovies.length} of ${filteredMovies.length} matching title${filteredMovies.length === 1 ? '' : 's'}`}
                </p>
                <p className="text-[11px] text-zinc-500 mt-2 max-w-xl">
                  Provider names appear only when live, {(tmdbRegion ?? 'US').toUpperCase()}-specific availability data was returned. Use “Where to watch” to recheck because listings can change.
                  {tmdbCheckedAt && Number.isFinite(Date.parse(tmdbCheckedAt))
                    ? ` Live data checked ${new Date(tmdbCheckedAt).toLocaleString()}.`
                    : ''}
                </p>
                {searchQuery && tmdbExpandedCollections.length > 0 && (
                  <p role="status" className="mt-2 max-w-xl text-[11px] leading-relaxed text-sky-200/80">
                    Including franchise titles from {tmdbExpandedCollections.map(({ name }) => name).join(', ')}. TMDB lists {tmdbExpandedCollections.reduce((total, collection) => total + (collection.partCount ?? 0), 0)} parts across these collections; direct search remains paginated.
                  </p>
                )}
                {searchQuery && tmdbWarnings.length > 0 && (
                  <p role="status" className="mt-2 max-w-xl rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100/80">
                    Live catalog note: {tmdbWarnings[0]}
                    {tmdbWarnings.length > 1 ? ` (${tmdbWarnings.length - 1} more verification note${tmdbWarnings.length === 2 ? '' : 's'}.)` : ''}
                  </p>
                )}
                {searchQuery && liveSearchStatus === 'unavailable' && (
                  <p role="status" className="mt-2 max-w-xl rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100/75">
                    Expanded live catalog search is unavailable right now, so these results come from StreamFlicker&apos;s bundled discovery catalog. Current service listings open in a separate availability search.
                  </p>
                )}
                {(getSearchReason(filteredMovies[0], searchQuery) || discoveryMode === 'family' || occasion !== 'all') && (
                  <p className="text-[11px] text-emerald-200/75 mt-2 max-w-xl">
                    {getSearchReason(filteredMovies[0], searchQuery)
                      ?? (discoveryMode === 'family'
                        ? 'Family-friendly mode filters out R-rated titles and high-risk themes.'
                        : occasion === 'date-night'
                        ? 'Date-night mode focuses on romance and relationship-driven, conversation-friendly movies.'
                        : 'Quick-watch mode prioritizes titles around 110 minutes or less.')}
                  </p>
                )}
                {searchQuery && tmdbPagination?.hasMore && (
                  <button
                    type="button"
                    onClick={loadMoreLiveResults}
                    disabled={isLoadingMoreLive}
                    className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isLoadingMoreLive
                      ? 'Loading more live results…'
                      : `Load more live results (page ${tmdbPagination.page + 1} of ${tmdbPagination.totalPages})`}
                  </button>
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

                {showWebMonetizationLinks
                  && publicMonetization.ads.enabled
                  && publicMonetization.ads.resultsSlot && (
                  <GoogleAd
                    clientId={publicMonetization.ads.clientId}
                    slot={publicMonetization.ads.resultsSlot}
                    placement="results"
                  />
                )}

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
              <div className="glass-panel rounded-3xl px-5 py-10 sm:p-12 text-center my-8 max-w-xl mx-auto border border-zinc-800">
                <Film size={40} className="mx-auto mb-4 text-zinc-500" aria-hidden="true" />
                <h3 className="font-display font-bold text-xl text-white mb-2">No movies match your filters</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  {searchQuery
                    ? 'Try a shorter title or remove one of the active filters above. You can also clear everything and browse the catalog.'
                    : discoveryMode === 'family'
                    ? 'Try Everything mode, or confirm the provider rating before choosing a family title.'
                    : occasion === 'date-night'
                    ? 'Try Everything mode or a broader genre to find more date-night options.'
                    : occasion === 'quick-watch'
                    ? 'Try Everything mode if you can spend a little longer with your movie.'
                    : 'Try resetting a filter to discover more titles.'}
                </p>
                <button
                  onClick={() => startDiscovery('all')}
                  className="min-h-11 bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Clear filters and browse all
                </button>
              </div>
            )}
          </>
        )}

        {showWebMonetizationLinks && (
          <MonetizationPanel links={publicMonetization} />
        )}

        {isHomeView && <DiscoveryExplainer />}

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#070709] py-10 mt-auto safe-area-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs text-zinc-500">
          <div>
            <span className="font-display font-bold text-zinc-300 text-sm block mb-1">
              StreamFlicker
            </span>
            <p>© {new Date().getFullYear()} StreamFlicker. Movie trailers and streaming discovery.</p>
            {affiliateConfig.amazonTag && (
              <p className="mt-2 max-w-xl text-[10px] leading-relaxed text-zinc-600">
                As an Amazon Associate, StreamFlicker earns from qualifying purchases.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-zinc-400 font-medium">
            <a href="/movie-night" className="min-h-11 inline-flex items-center hover:text-white focus-visible:text-white transition-colors">Movie-night guide</a>
            <a
              href="/about"
              className="min-h-11 inline-flex items-center hover:text-white focus-visible:text-white transition-colors"
            >
              About StreamFlicker
            </a>
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
              Monetization Disclosure
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

      <Suspense fallback={null}>
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
            legacyWatchlistCount={getLegacyWatchlist().length}
            onImportLegacyWatchlist={handleImportLegacyWatchlist}
            onClose={() => setShowWatchlist(false)}
            onWatchTrailer={openTrailer}
            onRemove={toggleBookmark}
          />
        )}

        {showMovieNight && catalogStatus === 'ready' && (
          <MovieNightPlanner
            movies={validatedCatalog}
            watchlist={watchlist}
            onClose={() => setShowMovieNight(false)}
            onWatchTrailer={(movie) => {
              setShowMovieNight(false);
              openTrailer(movie);
            }}
            isBookmarked={isBookmarked}
            onToggleBookmark={toggleBookmark}
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

        {showAccountSettings && user && (
          <AccountSettingsModal
            user={user}
            onClose={() => setShowAccountSettings(false)}
            onDeleteAccount={handleDeleteAccount}
            legacyWatchlistCount={getLegacyWatchlist().length}
            onImportLegacyWatchlist={handleImportLegacyWatchlist}
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
        {showAuth && authEnabled && (
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
          />
        )}
      </Suspense>
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
