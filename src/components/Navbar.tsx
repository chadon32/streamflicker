import { Search, Bookmark, Menu, X, User, LogOut, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Movie } from '../data/catalog';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  suggestions: Movie[];
  onSelectSuggestion: (movie: Movie) => void;
  watchlistCount: number;
  onOpenWatchlist: () => void;
  onOpenMovieNight: () => void;
  onOpenAccountSettings: () => void;
  onGoHome: () => void;
  user: SupabaseUser | null;
  onSignOut: () => void;
}

const MAX_SUGGESTIONS = 12;

export function Navbar({
  searchQuery,
  setSearchQuery,
  suggestions,
  onSelectSuggestion,
  watchlistCount,
  onOpenWatchlist,
  onOpenMovieNight,
  onOpenAccountSettings,
  onGoHome,
  user,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEmptySearchHint, setShowEmptySearchHint] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const visibleSuggestions = suggestions.slice(0, MAX_SUGGESTIONS);
  const listOpen = showSuggestions && Boolean(searchQuery.trim()) && visibleSuggestions.length > 0;
  // Phones keep the header to one row; search opens on demand (or stays open with a query).
  const phoneSearchVisible = searchOpen || Boolean(searchQuery);
  const watchlistLabel = `Open watchlist${watchlistCount > 0 ? `, ${watchlistCount} saved ${watchlistCount === 1 ? 'movie' : 'movies'}` : ''}`;

  // Hide suggestions and the account menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen && !accountOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen, accountOpen]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [searchQuery, suggestions.length]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  return (
    <header className="sticky top-0 z-40 glass-nav safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between min-h-14 py-2 sm:min-h-20 sm:py-3 lg:py-0 gap-x-3 gap-y-2 sm:gap-4">

          {/* Logo */}
          <button
            onClick={() => {
              onGoHome();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 sm:gap-3 group text-left shrink-0"
            aria-label="StreamFlicker home"
          >
            <img
              src="/streamflicker-logo.svg"
              alt=""
              aria-hidden="true"
              width="40"
              height="40"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform duration-300"
            />
            <div>
              <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Stream<span className="text-rose-500">Flicker</span>
              </span>
              <span className="hidden lg:block text-xs font-medium text-rose-300 -mt-0.5">
                Find tonight&apos;s movie
              </span>
            </div>
          </button>

          {/* Phone controls: search and menu */}
          <div className="ml-auto flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-expanded={phoneSearchVisible}
              aria-controls="movie-search-panel"
              aria-label="Search movies"
              className="grid size-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300"
            >
              <Search size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Search Bar with Intelligent Auto-Suggestions */}
          <div
            id="movie-search-panel"
            ref={searchContainerRef}
            className={`${phoneSearchVisible ? 'order-3 w-full' : 'hidden'} sm:block sm:order-none sm:w-auto sm:flex-1 sm:max-w-xl relative`}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-2" size={18} aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value.slice(0, 120));
                  setShowEmptySearchHint(false);
                  setShowSuggestions(true);
                }}
                onKeyDown={(event) => {
                  const visibleSuggestionCount = visibleSuggestions.length;
                  if (event.key === 'ArrowDown' && visibleSuggestionCount > 0) {
                    event.preventDefault();
                    setShowSuggestions(true);
                    setActiveSuggestionIndex((current) => (current + 1) % visibleSuggestionCount);
                    return;
                  }
                  if (event.key === 'ArrowUp' && visibleSuggestionCount > 0) {
                    event.preventDefault();
                    setShowSuggestions(true);
                    setActiveSuggestionIndex((current) => (current <= 0 ? visibleSuggestionCount - 1 : current - 1));
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setShowSuggestions(false);
                    setActiveSuggestionIndex(-1);
                    return;
                  }
                  if (event.key === 'Enter' && activeSuggestionIndex >= 0 && visibleSuggestions[activeSuggestionIndex]) {
                    event.preventDefault();
                    setShowSuggestions(false);
                    onSelectSuggestion(visibleSuggestions[activeSuggestionIndex]);
                    return;
                  }
                  if (event.key === 'Enter' && !searchQuery.trim()) {
                    event.preventDefault();
                    setShowSuggestions(false);
                    setShowEmptySearchHint(true);
                    searchInputRef.current?.focus();
                  }
                }}
                placeholder="Search titles, actors, themes, or moods"
                aria-label="Search movies"
                aria-describedby="movie-search-help"
                ref={searchInputRef}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={listOpen}
                aria-controls={listOpen ? 'movie-search-suggestions' : undefined}
                aria-activedescendant={listOpen && activeSuggestionIndex >= 0 ? `movie-suggestion-${visibleSuggestions[activeSuggestionIndex]?.id}` : undefined}
                maxLength={120}
                autoComplete="off"
                className="w-full min-h-11 bg-zinc-900/90 border border-zinc-800 focus:border-rose-500/80 rounded-xl pl-11 pr-11 py-2.5 text-sm text-zinc-100 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-zinc-800 hover:text-white"
                  aria-label="Clear movie search"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            <p id="movie-search-help" className={`px-4 pt-1.5 text-xs text-ink-3 ${showEmptySearchHint ? '' : 'sr-only'}`} aria-live="polite">
              {showEmptySearchHint ? 'Type a title, actor, theme, mood, or phrase to search the catalog.' : 'Search by title, actor, theme, mood, or a phrase.'}
            </p>

            {/* Suggestions. The heading sits outside the listbox so the listbox holds only options. */}
            {listOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 glass-modal rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl z-50 max-h-[420px] overflow-y-auto">
                <p className="px-4 py-2 bg-zinc-950/80 text-xs font-bold uppercase tracking-wider text-ink-2 sticky top-0 backdrop-blur-md z-10">
                  Top matches{suggestions.length > visibleSuggestions.length ? ` (${visibleSuggestions.length} of ${suggestions.length})` : ` (${suggestions.length})`}
                </p>
                <div id="movie-search-suggestions" role="listbox" aria-label="Top matches" className="divide-y divide-zinc-800/80">
                  {visibleSuggestions.map((movie, index) => (
                    <button
                      key={movie.id}
                      id={`movie-suggestion-${movie.id}`}
                      role="option"
                      aria-selected={activeSuggestionIndex === index}
                      tabIndex={-1}
                      onClick={() => {
                        setShowSuggestions(false);
                        setActiveSuggestionIndex(-1);
                        onSelectSuggestion(movie);
                      }}
                      className={`w-full min-h-14 flex items-center gap-3 p-3 text-left transition-colors group ${
                        activeSuggestionIndex === index ? 'bg-zinc-800 ring-2 ring-inset ring-rose-400/80' : 'hover:bg-zinc-800/80'
                      }`}
                    >
                      <img
                        src={movie.posterUrl}
                        alt=""
                        width="40"
                        height="56"
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-14 object-cover rounded-lg shrink-0 border border-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-sm text-zinc-100 group-hover:text-rose-300 truncate">
                          {movie.title}
                        </span>
                        <span className="block text-xs text-ink-2 font-medium truncate mt-0.5">
                          {movie.year} • {movie.genre.join(', ')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop actions (from lg: the bar fits, and Movie night stays one click away) */}
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={onOpenMovieNight} className="btn btn-secondary">
              <Sparkles size={17} className="text-rose-400" aria-hidden="true" />
              <span>Movie night</span>
            </button>
            <button onClick={onOpenWatchlist} aria-label={watchlistLabel} className="btn btn-secondary">
              <Bookmark size={17} className="text-rose-400" aria-hidden="true" />
              <span>Watchlist</span>
              {watchlistCount > 0 && (
                <span className="rounded-full bg-rose-700 px-2 py-0.5 text-xs font-bold text-white">
                  {watchlistCount}
                </span>
              )}
            </button>

            {user && (
              <div ref={accountRef} className="relative">
                <button
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  aria-controls="account-menu"
                  aria-label="Account menu"
                  className="grid size-11 place-items-center rounded-full border border-zinc-800 bg-zinc-900/80 transition-all hover:bg-zinc-800"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-gradient-to-tr from-rose-600 to-amber-500">
                    <User size={14} className="text-white" aria-hidden="true" />
                  </span>
                </button>
                {accountOpen && (
                  <div id="account-menu" className="absolute right-0 top-full mt-2 w-56 glass-modal rounded-xl border border-zinc-800 shadow-xl z-50">
                    <p className="p-3 border-b border-zinc-800/80 text-xs text-ink-2 truncate">{user.email}</p>
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setAccountOpen(false);
                          onOpenAccountSettings();
                        }}
                        className="w-full min-h-11 flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
                      >
                        <User size={16} aria-hidden="true" />
                        Account settings
                      </button>
                      <button
                        onClick={() => {
                          setAccountOpen(false);
                          onSignOut();
                        }}
                        className="w-full min-h-11 flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-rose-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                      >
                        <LogOut size={16} aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu toggle: shows the saved count so the watchlist is never invisible */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : `Open navigation menu${watchlistCount > 0 ? `, ${watchlistCount} saved ${watchlistCount === 1 ? 'movie' : 'movies'}` : ''}`}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            {!mobileMenuOpen && watchlistCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rose-700 px-1 text-xs font-bold leading-5 text-white" aria-hidden="true">
                {watchlistCount}
              </span>
            )}
          </button>

        </div>
      </div>

      {/* Menu drawer (below lg) */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-menu" className="lg:hidden border-t border-zinc-800 bg-zinc-950 p-4 space-y-3">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenMovieNight();
            }}
            className="btn btn-secondary btn-lg w-full justify-start"
          >
            <Sparkles size={18} className="text-rose-400" aria-hidden="true" />
            <span>Plan a movie night</span>
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenWatchlist();
            }}
            aria-label={watchlistLabel}
            className="btn btn-secondary btn-lg w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-rose-400" aria-hidden="true" />
              <span>Watchlist</span>
            </div>
            {watchlistCount > 0 && (
              <span className="bg-rose-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {watchlistCount}
              </span>
            )}
          </button>

          {user ? (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAccountSettings();
                }}
                className="btn btn-secondary btn-lg w-full justify-start"
              >
                <User size={18} className="text-rose-400" aria-hidden="true" />
                <span>Account settings</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignOut();
                }}
                className="btn btn-secondary btn-lg w-full justify-start whitespace-normal text-left"
              >
                <LogOut size={18} className="shrink-0 text-rose-400" aria-hidden="true" />
                <span>Sign out {user.email ? `(${user.email})` : ''}</span>
              </button>
            </>
          ) : (
            <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-center text-xs text-ink-2">Your watchlist and movie nights stay on this device.</p>
          )}
        </div>
      )}
    </header>
  );
}
