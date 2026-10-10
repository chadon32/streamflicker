import { DiscoveryExplainer } from '../components/DiscoveryExplainer';

// Useful first-response content, not a second app. createRoot replaces this
// shell; the same explainer also stays visible in the interactive homepage.
export function StaticHome() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <a href="/" className="inline-flex min-h-11 items-center gap-3 font-display text-xl font-bold">
        <img src="/streamflicker-logo.svg" alt="" width="40" height="40" />StreamFlicker
      </a>
      <h1 className="mt-12 max-w-2xl font-display text-4xl font-black tracking-tight sm:text-5xl">What are we watching tonight?</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">Find a movie by title, mood, or theme. Watch trailers, save a local shortlist, and check current streaming availability.</p>
      <p className="mt-6 text-sm text-zinc-400" role="status">Loading movie discovery. The guide below is available while the app loads.</p>
      <noscript><p className="mt-4 text-zinc-300">Enable JavaScript to use search, trailers, the planner, and your watchlist. You can still read our movie-night guide and About page.</p></noscript>
      <DiscoveryExplainer />
    </main>
  );
}
