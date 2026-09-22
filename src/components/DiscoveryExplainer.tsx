import { ArrowRight, Check, Film, Search, ShieldCheck } from 'lucide-react';

/**
 * A static explainer that can sit below the live catalog or its loading
 * fallback. It makes no assumptions about catalog state and needs no client
 * runtime to explain the real discovery path.
 */
export function DiscoveryExplainer() {
  return (
    <section className="border-y border-white/[0.08] bg-zinc-950/70" aria-labelledby="discovery-explainer-heading">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-20 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <h2 id="discovery-explainer-heading" className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
            A shorter route to movie night
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Search by title, actor, or theme. Narrow by occasion, runtime, genre, or verified provider, then preview a trailer and save a local shortlist.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href="/movie-night"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500 active:scale-[0.98]"
            >
              How to pick a movie tonight
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              href="/about"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/65 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
            >
              About StreamFlicker
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

        <ul className="space-y-4 text-sm text-zinc-300" aria-label="StreamFlicker discovery features">
          <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
            <Search className="mt-0.5 shrink-0 text-rose-400" size={19} aria-hidden="true" />
            <span>Find a familiar title or start from a focused shortcut such as family night, date night, quick watch, or Zombie movies.</span>
          </li>
          <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
            <Film className="mt-0.5 shrink-0 text-rose-400" size={19} aria-hidden="true" />
            <span>Use a trailer to get a feel for the pick, then save it to a Watchlist that stays on this device in guest mode.</span>
          </li>
          <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
            <ShieldCheck className="mt-0.5 shrink-0 text-rose-400" size={19} aria-hidden="true" />
            <span>Open region-checked provider links when available. Listings vary by region and time, and StreamFlicker does not host movies.</span>
          </li>
          <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
            <Check className="mt-0.5 shrink-0 text-emerald-400" size={19} aria-hidden="true" />
            <span>Family mode can narrow the field, but it cannot guarantee suitability for every child.</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
