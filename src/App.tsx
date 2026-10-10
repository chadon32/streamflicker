import { lazy, Suspense, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { STREAMING_PROVIDERS, type Movie } from './data/catalog';
import { BROWSABLE_RECORD_COUNT, HOME_MOVIES, SHORTCUT_COUNTS } from './data/homeCatalog';
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
import { CATALOG_CHECKED_AT, getValidatedCatalog, getValidatedCatalogMetadata } from './services/catalogQuality';
import { SORT_OPTIONS, countBrowsable, isKnownUnreleased, sortMovies, type SortMode } from './services/browseOrder';
import { getSpotlightMovies } from './services/spotlight';
import { formatCheckedDate } from './services/shareText';
import { useAuthSession } from './hooks/useAuthSession';
import { useBrowserCatalog } from './hooks/useBrowserCatalog';
import { PageSeo } from './seo/PageSeo';
import { hasPrivateQuery, SEO_PAGES } from './seo/pages';
import { DiscoveryExplainer } from './components/DiscoveryExplainer';
import { SiteFooter } from './components/SiteChrome';
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

const TrailerModal = lazy(() => import('./components/TrailerModal').then(({ TrailerModal }) => ({ default: TrailerModal })));
const ShareModal = lazy(() => import('./components/ShareModal').then(({ ShareModal }) => ({ default: ShareModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(({ SettingsModal }) => ({ default: SettingsModal })));
const AccountSettingsModal = lazy(() => import('./components/AccountSettingsModal').then(({ AccountSettingsModal }) => ({ default: AccountSettingsModal })));
const WatchlistModal = lazy(() => import('./components/WatchlistModal').then(({ WatchlistModal }) => ({ default: WatchlistModal })));
const MovieNightPlanner = lazy(() => import('./components/MovieNightPlanner').then(({ MovieNightPlanner }) => ({ default: MovieNightPlanner })));
const AuthModal = lazy(() => import('./components/AuthModal').then(({ AuthModal }) => ({ default: AuthModal })));
const BusinessPage = lazy(() => import('./components/BusinessPage').then(({ BusinessPage }) => ({ default: BusinessPage })));
const MovieNightGuide = lazy(() => import('./components/MovieNightGuide').then(({ MovieNightGuide }) => ({ default: MovieNightGuide })));
const PrivacyPage = lazy(() => import('./components/LegalPages').then(({ PrivacyPage }) => ({ default: PrivacyPage })));
const TermsPage = lazy(() => import('./components/LegalPages').then(({ TermsPage }) => ({ default: TermsPage })));
const ContactPage = lazy(() => import('./components/LegalPages').then(({ ContactPage }) => ({ default: ContactPage })));

/** A shortcut that opens a handful of results reads as broken, so it is not offered. */
const MIN_SHORTCUT_RESULTS = 12;

/** A stable empty list for the planner's catalog until the full catalog has loaded (a fresh [] would defeat its memoization). */
const NO_TITLES: Movie[] = [];

const PROVIDER_METADATA = new Map<string, (typeof STREAMING_PROVIDERS)[number]>(
  STREAMING_PROVIDERS.map((provider) => [provider.id, provider]),
);

const curationRankOf = (movieId: string) => getValidatedCatalogMetadata(movieId)?.curationRank;

function normalizeVisibleText(value: string) {
  return value.replace(/[–—]/g, '-');
}

function sortDateNightQuality(movies: Movie[]): Movie[] {
  return [...movies].sort((left, right) => {
    const leftRank = curationRankOf(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = curationRankOf(right.id) ?? Number.MAX_SAFE_INTEGER;
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
  const { user, authReady, wantSdk } = useAuthSession(authEnabled);
  // Accounts do not sync anything yet, so new sign-ups stay off unless the owner enables them.
  const accountSignUpEnabled = import.meta.env.VITE_ACCOUNT_SIGNUP_ENABLED === 'true';

  useEffect(() => {
    const syncPagePath = () => {
      setPagePath(window.location.pathname);
      setSearchQueryState(new URLSearchParams(window.location.search).get('q')?.slice(0, 200) || '');
    };
    window.addEventListener('popstate', syncPagePath);
    return () => window.removeEventListener('popstate', syncPagePath);
  }, []);

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
  const [sortMode, setSortMode] = useState<SortMode>('featured');
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

  const isHomeView =
    !browseCatalog &&
    !searchQuery &&
    !selectedTag &&
    selectedGenre === 'All' &&
    selectedEra === 'All' &&
    selectedProviders.length === 0 &&
    discoveryMode === 'all' &&
    occasion === 'all';

  // The home page runs on the reviewed titles that ship with the app (HOME_MOVIES).
  // The full 1,799-record catalog loads after first paint, or at once when search,
  // browse, filters, or a shared movie link need it.
  const [filtersOpened, setFiltersOpened] = useState(false);
  const [movieLinkPending] = useState(() => new URLSearchParams(window.location.search).has('movie'));
  const [showMovieNight, setShowMovieNight] = useState(false);
  // The planner also suggests well-known titles from the full catalog, so opening it starts the load.
  const needsFullCatalog = !isHomeView || filtersOpened || movieLinkPending || showMovieNight;
  const { catalog: loadedCatalog, status: catalogStatus, retry: retryCatalog } = useBrowserCatalog(needsFullCatalog);

  // A previously saved watchlist is a useful local fallback if the catalog cannot load.
  const fallbackCatalog = useMemo<Movie[]>(() => {
    if (catalogStatus !== 'error') return [];
    try {
      return parseStoredWatchlist(localStorage.getItem(activeWatchlistStorageKey))
        .map((movie) => ({ ...movie, recordSource: 'watchlist-fallback' as const }));
    } catch {
      return [];
    }
  }, [catalogStatus, activeWatchlistStorageKey]);
  const catalogUsingFallback = catalogStatus === 'error' && fallbackCatalog.length > 0;
  const catalogComplete = loadedCatalog !== null || catalogUsingFallback;
  // Settled means no more titles are coming: the catalog arrived, or loading failed for good.
  const catalogSettled = catalogComplete || catalogStatus === 'error';
  const canonicalCatalog = loadedCatalog ?? (catalogUsingFallback ? fallbackCatalog : HOME_MOVIES);
  // "Browse all N" says how many titles the grid will list. Until the catalog arrives that is the
  // build's snapshot; afterwards it is recounted so it can never disagree with the grid.
  const browsableCount = useMemo(
    () => (catalogComplete ? countBrowsable(canonicalCatalog) : BROWSABLE_RECORD_COUNT),
    [catalogComplete, canonicalCatalog],
  );

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
  const plannerLinkHandled = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleOpenMovieNight = useCallback(async () => {
    // iOS/iPadOS gets an app-owned native workflow that remains useful when
    // the network is unavailable. The web planner remains the fallback for
    // browsers and for older native builds while the plugin is unavailable.
    if (Capacitor.isNativePlatform() && await openNativeMovieNight()) return;
    setShowMovieNight(true);
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

  const handleOpenAuth = useCallback(() => {
    wantSdk();
    setShowAuth(true);
  }, [wantSdk]);

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
    if (!authReady || watchlistStorageKey !== activeWatchlistStorageKey || plannerLinkHandled.current) return;
    plannerLinkHandled.current = true;
    if (!Capacitor.isNativePlatform() && new URLSearchParams(window.location.search).get('plan') === '1') setShowMovieNight(true);
  }, [authReady, watchlistStorageKey, activeWatchlistStorageKey]);

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
        showToast(`Removed "${movie.title}" from your watchlist`);
        return prev.filter((m) => m.id !== movie.id);
      } else {
        showToast(`Added "${movie.title}" to your watchlist`);
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

  // The trusted surfaces (hero, rails, planner) are fed only by the reviewed titles
  // that ship with the app, never by the full catalog, a live result, or watchlist rows.
  const validatedCatalog = useMemo(() => getValidatedCatalog(HOME_MOVIES), []);

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
    // intent, and typo relevance. Do not erase that ordering with a generic sort.
    if (searchQuery.trim()) return filtered;

    // Browsing hides titles the catalog can prove are unreleased; searching for one by name still finds it.
    const released = filtered.filter((movie) => !isKnownUnreleased(movie));
    return occasion === 'date-night' && sortMode === 'featured'
      ? sortDateNightQuality(released)
      : sortMovies(released, sortMode, curationRankOf);
  }, [fullCatalog, selectedGenre, selectedEra, selectedTag, selectedProviders, discoveryMode, occasion, searchQuery, sortMode]);

  // Suggestions must respect the same filters as the visible results. This
  // prevents a keyboard selection from opening a title that the current
  // family, date-night, quick-watch, genre, or provider filters exclude.
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !catalogComplete) return [];
    return filteredMovies;
  }, [filteredMovies, searchQuery, catalogComplete]);

  // Recent titles from the reviewed subset.
  const recentCatalogHighlights = useMemo(() => {
    return sortMovies(validatedCatalog, 'featured', curationRankOf).slice(0, 10);
  }, [validatedCatalog]);

  // Four purposeful rails keep the landing page quick to scan and avoid
  // rendering a long stack of near-duplicate genre rows before someone knows
  // what they want to watch. A rail with too few reviewed titles is not shown.
  const familyMovieNight = useMemo(() => sortMovies(validatedCatalog.filter(isFamilyFriendly), 'featured', curationRankOf).slice(0, 10), [validatedCatalog]);
  const dateNightPicks = useMemo(() => sortDateNightQuality(validatedCatalog.filter(isDateNightFriendly)).slice(0, 10), [validatedCatalog]);
  const quickWatchPicks = useMemo(() => sortMovies(validatedCatalog.filter(isQuickWatch), 'featured', curationRankOf).slice(0, 10), [validatedCatalog]);

  // Spotlight Hero Movies (the same choice the home page's HTML preloads the image for).
  const spotlightMovies = useMemo(() => getSpotlightMovies(validatedCatalog), [validatedCatalog]);

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

  // Sharing from the trailer closes it first: two modal focus traps cannot be active at once.
  const handleShareFromTrailer = useCallback((movie: Movie) => {
    closeTrailer();
    setShareMovie(movie);
  }, [closeTrailer]);

  useEffect(() => {
    // Wait for the account/storage reset above, which intentionally closes dialogs,
    // so a shared /?movie= link is applied after it rather than wiped by it.
    if (!authReady || watchlistStorageKey !== activeWatchlistStorageKey) return;

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
  }, [fullCatalog, authReady, watchlistStorageKey, activeWatchlistStorageKey]);

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
  }, [searchQuery, selectedGenre, selectedEra, selectedTag, selectedProviders, discoveryMode, occasion, sortMode]);

  const displayedMovies = useMemo(() => {
    return filteredMovies.slice(0, displayLimit);
  }, [filteredMovies, displayLimit]);

  const familyLabel = 'PG-13 and under';
  const resultsLoading = !catalogComplete && catalogStatus !== 'error';
  const resultsFailed = catalogStatus === 'error' && !catalogUsingFallback;

  const pageTitle = activeTrailerMovie
    ? `${activeTrailerMovie.title} | StreamFlicker`
    : selectedTag
    ? `${getMicroTagLabel(selectedTag)} Movies | StreamFlicker`
    : selectedGenre !== 'All'
    ? `${selectedGenre} Movies | StreamFlicker`
    : discoveryMode === 'family'
    ? `${familyLabel} Movies | StreamFlicker`
    : occasion !== 'all'
    ? `${occasion === 'date-night' ? 'Date Night' : 'Quick Watch'} Movies | StreamFlicker`
    : selectedEra !== 'All'
    ? `${ERA_FILTERS.find(({ id }) => id === selectedEra)?.label ?? selectedEra} Movies | StreamFlicker`
    : searchQuery
    ? `Search: "${searchQuery}" | StreamFlicker`
    : SEO_PAGES['/'].title;

  if (pagePath === '/movie-night') {
    return <><PageSeo path="/movie-night" noindex={hasPrivateQuery(window.location.search)} /><Suspense fallback={<p className="p-8">Loading the guide…</p>}><MovieNightGuide /></Suspense></>;
  }

  if (pagePath === '/privacy' || pagePath === '/terms' || pagePath === '/contact') {
    const LegalPage = pagePath === '/privacy' ? PrivacyPage : pagePath === '/terms' ? TermsPage : ContactPage;
    return (
      <>
        <PageSeo path={pagePath} noindex={hasPrivateQuery(window.location.search)} />
        <Suspense fallback={<div className="min-h-[100dvh] bg-[#070709]" aria-busy="true" />}>
          <LegalPage />
        </Suspense>
      </>
    );
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

  const shortcutVisible = (count: number) => count >= MIN_SHORTCUT_RESULTS;

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
        className="fixed left-4 top-3 z-[110] -translate-y-20 rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
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
        onOpenAccountSettings={() => setShowAccountSettings(true)}
        onGoHome={() => startDiscovery('home')}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl border border-rose-400/40 flex items-center gap-2"
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Page Container */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16 flex-1 w-full">
        {catalogUsingFallback && (
          <div role="status" className="notice notice-warn mb-4">
            The catalog could not be refreshed, so your saved watchlist is shown as a local fallback. <button className="min-h-11 font-bold text-amber-300 underline" onClick={retryCatalog}>Retry catalog</button>
          </div>
        )}

        <section aria-label="Quick discovery" className="mb-6">
          {isHomeView && (
            <div className="flex flex-col gap-4 py-2 sm:py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">What are we watching tonight?</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">Answer three questions, get three picks, watch the trailer, then see where to stream.</p>
              </div>
              <button type="button" onClick={handleOpenMovieNight} className="btn btn-primary btn-lg w-fit shrink-0">
                <Sparkles size={18} aria-hidden="true" /> Plan a movie night <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          {isHomeView && (
            <details className="group max-w-3xl text-xs leading-relaxed text-ink-2">
              <summary className="min-h-11 cursor-pointer list-none py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                Our picks are reviewed ({formatCheckedDate(CATALOG_CHECKED_AT)}).{' '}
                <span className="whitespace-nowrap font-semibold text-rose-300 underline underline-offset-4 group-open:text-rose-200">How we choose</span>
              </summary>
              <p className="pb-2">
                The featured rows and the movie night planner use a short list of titles we picked by hand, checking each runtime and rating against TMDB. Elsewhere in the catalog a title shows a runtime and rating only when we could match it to TMDB with proof; otherwise they are left off. Always confirm details, and where to watch, before you press play.
              </p>
            </details>
          )}

          <FilterBar
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
            catalogReady={catalogComplete}
            onOpen={() => setFiltersOpened(true)}
            shortcuts={(
              <>
                <button type="button" onClick={() => startDiscovery('all')} className="chip">
                  <LayoutGrid size={15} aria-hidden="true" /> Browse all <span className="chip-count">{browsableCount.toLocaleString()}</span>
                </button>
                {shortcutVisible(SHORTCUT_COUNTS.family) && (
                  <button type="button" onClick={() => startDiscovery('family')} aria-pressed={discoveryMode === 'family'} className="chip">
                    <UsersRound size={15} aria-hidden="true" /> Family night
                  </button>
                )}
                {shortcutVisible(SHORTCUT_COUNTS.dateNight) && (
                  <button type="button" onClick={() => startDiscovery('date-night')} aria-pressed={occasion === 'date-night'} className="chip">
                    <Heart size={15} aria-hidden="true" /> Date night
                  </button>
                )}
                {shortcutVisible(SHORTCUT_COUNTS.quickWatch) && (
                  <button type="button" onClick={() => startDiscovery('quick-watch')} aria-pressed={occasion === 'quick-watch'} className="chip">
                    <Clock3 size={15} aria-hidden="true" /> Quick watch
                  </button>
                )}
                {shortcutVisible(SHORTCUT_COUNTS.zombies) && (
                  <button type="button" onClick={() => startDiscovery('zombies')} aria-pressed={selectedTag === '#ZombieOutbreak'} className="chip">Zombie movies</button>
                )}
              </>
            )}
          />
        </section>

        {/* Spotlight Hero Carousel */}
        {isHomeView && spotlightMovies.length > 0 && (
          <HeroCarousel
            movies={spotlightMovies}
            onWatchTrailer={openTrailer}
            isBookmarked={isBookmarked}
            onToggleBookmark={toggleBookmark}
          />
        )}

        {isHomeView
          && showWebMonetizationLinks
          && publicMonetization.sponsorship && (
          <SponsorSpotlight sponsorship={publicMonetization.sponsorship} />
        )}

        {/* Purposeful discovery rows */}
        {isHomeView && (
          <div className="space-y-4 mb-12">
            <MovieRow
              title="Top picks"
              subtitle="Reviewed titles for a fast first choice"
              icon={<Award className="text-rose-400" size={24} aria-hidden="true" />}
              movies={recentCatalogHighlights}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
            />

            <MovieRow
              title="Family movie night"
              subtitle="PG-13 and under, with higher-risk themes filtered out"
              icon={<UsersRound className="text-rose-400" size={24} aria-hidden="true" />}
              movies={familyMovieNight}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
            />

            <MovieRow
              title="Date-night picks"
              subtitle="Romance and relationship-driven, conversation-friendly movies"
              icon={<Heart className="text-rose-400" size={24} aria-hidden="true" />}
              movies={dateNightPicks}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
            />

            <MovieRow
              title="Quick watches"
              subtitle="Under 110 minutes, for when time is short"
              icon={<Clock3 className="text-rose-400" size={24} aria-hidden="true" />}
              movies={quickWatchPicks}
              onWatchTrailer={openTrailer}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
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
        {!isHomeView && (
          <>
            <div className="my-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight break-words">
                  <Clapperboard className="mr-2 inline-block text-rose-500" size={26} aria-hidden="true" />
                  {selectedTag
                    ? `${getMicroTagLabel(selectedTag)} movies`
                    : selectedGenre !== 'All'
                    ? `${selectedGenre} movies`
                    : discoveryMode === 'family'
                    ? `${familyLabel} movies`
                    : occasion === 'date-night'
                    ? 'Date-night movies'
                    : occasion === 'quick-watch'
                    ? 'Quick-watch movies'
                    : selectedProviders.length > 0
                    ? 'Streaming movies'
                    : selectedEra !== 'All'
                    ? `${ERA_FILTERS.find(({ id }) => id === selectedEra)?.label ?? selectedEra} movies`
                    : searchQuery
                    ? `Results for “${searchQuery.length > 80 ? `${searchQuery.slice(0, 77)}…` : searchQuery}”`
                    : 'Browse all movies'}
                </h1>
                <p className="mt-1 text-sm text-ink-2" aria-live="polite">
                  {resultsLoading
                    ? 'Loading the full catalog…'
                    : isSearchingTMDB
                    ? 'Checking optional live search results…'
                    : `Showing ${displayedMovies.length.toLocaleString()} of ${filteredMovies.length.toLocaleString()} matching title${filteredMovies.length === 1 ? '' : 's'}`}
                </p>
                <p className="text-xs text-ink-3 mt-2 max-w-xl">
                  Provider names appear only when live, {(tmdbRegion ?? 'US').toUpperCase()}-specific availability data was returned. Use &ldquo;Where to watch&rdquo; to recheck because listings can change.
                  {tmdbCheckedAt && Number.isFinite(Date.parse(tmdbCheckedAt))
                    ? ` Live data checked ${new Date(tmdbCheckedAt).toLocaleString()}.`
                    : ''}
                </p>
                {searchQuery && tmdbExpandedCollections.length > 0 && (
                  <p role="status" className="mt-2 max-w-xl text-xs leading-relaxed text-ink-2">
                    Including franchise titles from {tmdbExpandedCollections.map(({ name }) => name).join(', ')}. TMDB lists {tmdbExpandedCollections.reduce((total, collection) => total + (collection.partCount ?? 0), 0)} parts across these collections; direct search remains paginated.
                  </p>
                )}
                {searchQuery && tmdbWarnings.length > 0 && (
                  <p role="status" className="notice notice-warn mt-2 max-w-xl">
                    Live catalog note: {tmdbWarnings[0]}
                    {tmdbWarnings.length > 1 ? ` (${tmdbWarnings.length - 1} more verification note${tmdbWarnings.length === 2 ? '' : 's'}.)` : ''}
                  </p>
                )}
                {searchQuery && liveSearchStatus === 'unavailable' && (
                  <p role="status" className="notice notice-warn mt-2 max-w-xl">
                    Expanded live catalog search is unavailable right now, so these results come from StreamFlicker&apos;s built-in catalog. &ldquo;Where to watch&rdquo; opens a separate availability search.
                  </p>
                )}
                {(getSearchReason(filteredMovies[0], searchQuery) || discoveryMode === 'family' || occasion !== 'all') && (
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-ink-2">
                    {getSearchReason(filteredMovies[0], searchQuery)
                      ?? (discoveryMode === 'family'
                        ? 'This filter keeps titles with a confirmed PG-13 or lower rating and drops high-risk horror and thriller themes.'
                        : occasion === 'date-night'
                        ? 'Date-night mode focuses on romance and relationship-driven, conversation-friendly movies.'
                        : 'Quick-watch mode keeps titles with a confirmed runtime of about 110 minutes or less.')}
                  </p>
                )}
                {searchQuery && tmdbPagination?.hasMore && (
                  <button
                    type="button"
                    onClick={loadMoreLiveResults}
                    disabled={isLoadingMoreLive}
                    className="btn btn-secondary mt-4 disabled:cursor-wait"
                  >
                    {isLoadingMoreLive
                      ? 'Loading more live results…'
                      : `Load more live results (page ${tmdbPagination.page + 1} of ${tmdbPagination.totalPages})`}
                  </button>
                )}
              </div>

              {!searchQuery.trim() && !resultsLoading && (
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-movies" className="text-sm font-semibold text-ink-2">Sort by</label>
                  <select
                    id="sort-movies"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200"
                  >
                    {SORT_OPTIONS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
              )}
            </div>

            {resultsFailed ? (
              <section role="alert" className="glass-panel my-8 rounded-2xl p-8 text-center">
                <Film size={36} className="mx-auto mb-3 text-rose-400" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-white">The catalog could not be loaded</h2>
                <p className="mt-2 text-sm text-ink-2">Check your connection and retry. Your watchlist stays in this browser.</p>
                <button onClick={retryCatalog} className="btn btn-primary mt-5">
                  Retry catalog
                </button>
              </section>
            ) : resultsLoading ? (
              <div role="status" aria-live="polite" className="my-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
                <span className="sr-only">Loading the full catalog</span>
                {Array.from({ length: 10 }, (_, index) => (
                  <div key={index} className="skeleton-loader aspect-[2/3] rounded-2xl" />
                ))}
              </div>
            ) : filteredMovies.length > 0 ? (
              <>
                {/* Card titles are h3s; this keeps the outline h1 → h2 → h3 for screen-reader navigation. */}
                <h2 className="sr-only">Matching movies</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {displayedMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onWatchTrailer={openTrailer}
                      isBookmarked={isBookmarked(movie.id)}
                      onToggleBookmark={() => toggleBookmark(movie)}
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

                {/* Show more */}
                {displayLimit < filteredMovies.length && (
                  <div className="flex justify-center mt-12 mb-6">
                    <button onClick={() => setDisplayLimit((prev) => prev + 30)} className="btn btn-secondary btn-lg px-8">
                      <span>Show {Math.min(30, filteredMovies.length - displayLimit)} more <span className="font-medium text-ink-2">({(filteredMovies.length - displayLimit).toLocaleString()} left)</span></span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-panel rounded-3xl px-5 py-10 sm:p-12 text-center my-8 max-w-xl mx-auto border border-zinc-800">
                <Film size={40} className="mx-auto mb-4 text-ink-3" aria-hidden="true" />
                <h2 className="font-display font-bold text-xl text-white mb-2 break-words">
                  {searchQuery.trim()
                    ? `No movies match “${searchQuery.length > 60 ? `${searchQuery.slice(0, 57)}…` : searchQuery}”`
                    : 'No movies match these filters'}
                </h2>
                <p className="text-sm text-ink-2 mb-6">
                  {searchQuery
                    ? 'Try a shorter title or remove one of the active filters above. You can also clear everything and browse the catalog.'
                    : discoveryMode === 'family'
                    ? 'Try Everything, or confirm the rating yourself before choosing a family title.'
                    : occasion === 'date-night'
                    ? 'Try Everything or a broader genre to find more date-night options.'
                    : occasion === 'quick-watch'
                    ? 'Try Everything if you can spend a little longer with your movie.'
                    : 'Try resetting a filter to discover more titles.'}
                </p>
                <button onClick={() => startDiscovery('all')} className="btn btn-primary">
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
      <SiteFooter
        disclosure={affiliateConfig.amazonTag && (
          <p>As an Amazon Associate, StreamFlicker earns from qualifying purchases.</p>
        )}
      >
        <button
          onClick={() => setShowSettings(true)}
          className="min-h-11 transition-colors hover:text-white"
        >
          My streaming services
        </button>
        {authEnabled && !user && (
          <button
            onClick={handleOpenAuth}
            className="min-h-11 transition-colors hover:text-white"
          >
            Sign in
          </button>
        )}
      </SiteFooter>

      <Suspense fallback={null}>
        {/* Trailer Video Player Modal */}
        {activeTrailerMovie && (
          <TrailerModal
            movie={activeTrailerMovie}
            onClose={closeTrailer}
            onNextTrailer={handleNextTrailer}
            isBookmarked={isBookmarked(activeTrailerMovie.id)}
            onToggleBookmark={toggleBookmark}
            onShare={handleShareFromTrailer}
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
            onBrowse={() => {
              setShowWatchlist(false);
              startDiscovery('all');
            }}
          />
        )}

        {showMovieNight && (
          <MovieNightPlanner
            reviewedMovies={validatedCatalog}
            catalog={catalogComplete ? canonicalCatalog : NO_TITLES}
            catalogReady={catalogSettled}
            watchlist={watchlist}
            onClose={() => setShowMovieNight(false)}
            onWatchTrailer={(movie) => {
              setShowMovieNight(false);
              openTrailer(movie);
            }}
            isBookmarked={isBookmarked}
            onToggleBookmark={toggleBookmark}
            onBrowseAll={() => {
              setShowMovieNight(false);
              startDiscovery('all');
            }}
          />
        )}

        {/* Share Modal */}
        {shareMovie && (
          <ShareModal
            movie={shareMovie}
            onClose={() => setShareMovie(null)}
          />
        )}

        {/* My streaming services */}
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

        {/* Auth Modal */}
        {showAuth && authEnabled && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuthSuccess={() => setShowAuth(false)}
            allowSignUp={accountSignUpEnabled}
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
