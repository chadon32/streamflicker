import { Search, Bookmark, Play, Settings, ShieldCheck, Menu, X, Star, LogIn, User, LogOut } from 'lucide-react';
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
  onOpenSettings: () => void;
  onOpenLegal: () => void;
  onGoHome: () => void;
  user: SupabaseUser | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export function Navbar({
  searchQuery,
  setSearchQuery,
  suggestions,
  onSelectSuggestion,
  watchlistCount,
  onOpenWatchlist,
  onOpenSettings,
  onOpenLegal,
  onGoHome,
  user,
  onOpenAuth,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEmptySearchHint, setShowEmptySearchHint] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hide suggestions dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [searchQuery, suggestions.length]);

  return (
    <header className="sticky top-0 z-40 glass-nav safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between min-h-20 py-3 sm:py-0 gap-3 sm:gap-4">
          
          {/* Logo */}
          <button 
            onClick={() => {
              onGoHome();
              setMobileMenuOpen(false);
            }} 
            className="flex items-center gap-2.5 sm:gap-3 group text-left shrink-0"
            aria-label="StreamFlicker home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform duration-300">
              <Play size={20} className="fill-white text-white translate-x-0.5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Stream<span className="text-rose-500">Flicker</span>
              </span>
              <span className="hidden lg:block text-[10px] font-semibold tracking-wider text-rose-400/90 uppercase -mt-1">
                Instant Trailers & Streaming
              </span>
            </div>
          </button>

          {/* Search Bar with Intelligent Auto-Suggestions */}
          <div ref={searchContainerRef} className="order-3 sm:order-none w-full sm:flex-1 sm:max-w-xl relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
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
                  const visibleSuggestionCount = Math.min(suggestions.length, 12);
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
                  if (event.key === 'Enter' && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
                    event.preventDefault();
                    setShowSuggestions(false);
                    onSelectSuggestion(suggestions[activeSuggestionIndex]);
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
                aria-expanded={showSuggestions && Boolean(searchQuery.trim()) && suggestions.length > 0}
                aria-controls="movie-search-suggestions"
                aria-activedescendant={activeSuggestionIndex >= 0 ? `movie-suggestion-${suggestions[activeSuggestionIndex]?.id}` : undefined}
                maxLength={120}
                autoComplete="off"
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-rose-500/80 rounded-full pl-11 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-rose-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full w-5 h-5 flex items-center justify-center"
                  aria-label="Clear movie search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <p id="movie-search-help" className={`px-4 pt-1.5 text-[11px] text-zinc-500 ${showEmptySearchHint ? '' : 'sr-only'}`} aria-live="polite">
              {showEmptySearchHint ? 'Type a title, actor, theme, mood, or phrase to search the catalog.' : 'Search by title, actor, theme, mood, or a phrase.'}
            </p>

            {/* Intelligent Suggestions Dropdown */}
            {showSuggestions && searchQuery.trim() && suggestions.length > 0 && (
              <div
                id="movie-search-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 glass-modal rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl z-50 max-h-[420px] overflow-y-auto divide-y divide-zinc-800/80"
              >
                <div className="px-4 py-2 bg-zinc-950/80 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sticky top-0 backdrop-blur-md z-10">
                  Smart Match Suggestions ({suggestions.length})
                </div>
                {suggestions.slice(0, 12).map((movie) => (
                  <button
                    key={movie.id}
                    id={`movie-suggestion-${movie.id}`}
                    role="option"
                    aria-selected={activeSuggestionIndex === suggestions.indexOf(movie)}
                    onClick={() => {
                      setShowSuggestions(false);
                      setActiveSuggestionIndex(-1);
                      onSelectSuggestion(movie);
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors group ${
                      activeSuggestionIndex === suggestions.indexOf(movie) ? 'bg-zinc-800/80' : 'hover:bg-zinc-800/80'
                    }`}
                  >
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      width="40"
                      height="56"
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-14 object-cover rounded-lg shrink-0 border border-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-zinc-100 group-hover:text-rose-400 truncate">
                          {movie.title}
                        </span>
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          <Star size={10} className="fill-amber-400" /> {movie.score}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                        {movie.year} • {movie.genre.join(', ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden xl:flex items-center gap-3">
            <button
              onClick={onOpenWatchlist}
              aria-label={`Open Watchlist${watchlistCount > 0 ? `, ${watchlistCount} saved ${watchlistCount === 1 ? 'movie' : 'movies'}` : ''}`}
              className="relative flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm group"
            >
              <Bookmark size={17} className="text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Watchlist</span>
              {watchlistCount > 0 && (
                <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md animate-scale-up">
                  {watchlistCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenSettings}
              title="Preferences and integrations"
              aria-label="Open Preferences and integrations"
              className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={onOpenLegal}
              title="Trust and legal information"
              aria-label="Open Trust and legal information"
              className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ShieldCheck size={18} />
            </button>
            
            {/* Auth Button */}
            <div className="h-6 w-px bg-zinc-800 mx-1"></div>
            {user ? (
              <div className="relative group">
                <button
                  className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-full text-sm font-medium transition-all shadow-sm"
                  aria-label="Open account menu"
                  aria-haspopup="menu"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center">
                    <User size={14} className="text-white" />
                  </div>
                </button>
                {/* Dropdown */}
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-48 glass-modal rounded-xl border border-zinc-800 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50"
                >
                  <div className="p-3 border-b border-zinc-800/80 text-xs text-zinc-400 truncate">
                    {user.email}
                  </div>
                  <div className="p-1.5">
                    <button 
                      onClick={onSignOut}
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-rose-400 hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-bold transition-all shadow-md shadow-rose-600/20"
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 shrink-0"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-menu" className="xl:hidden border-t border-zinc-800 bg-zinc-950 p-4 space-y-3">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenWatchlist();
            }}
            aria-label={`Open Watchlist${watchlistCount > 0 ? `, ${watchlistCount} saved ${watchlistCount === 1 ? 'movie' : 'movies'}` : ''}`}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 text-zinc-200 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-rose-400" />
              <span>Watchlist</span>
            </div>
            {watchlistCount > 0 && (
              <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {watchlistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenSettings();
            }}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-zinc-900 text-zinc-200 text-sm font-medium"
          >
            <Settings size={18} className="text-amber-400" />
            <span>Preferences & integrations</span>
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenLegal();
            }}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-zinc-900 text-zinc-200 text-sm font-medium"
          >
            <ShieldCheck size={18} className="text-emerald-400" />
            <span>Trust & legal information</span>
          </button>

          {user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2 p-3 rounded-xl bg-zinc-900 text-zinc-200 text-sm font-medium"
            >
              <LogOut size={18} className="text-rose-400" />
              <span>Sign Out {user.email ? `(${user.email})` : ''}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full flex items-center gap-2 p-3 rounded-xl bg-rose-600 text-white text-sm font-bold"
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
