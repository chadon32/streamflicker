import { ArrowRight, Check, Film, Search, ShieldCheck } from 'lucide-react';

/**
 * A static explainer that can sit below the live catalog or its loading
 * fallback. It makes no assumptions about catalog state and needs no client
 * runtime to explain the real discovery path. It lives inside the page's own
 * container, so it adds no side padding of its own and lines up with the rows above.
 */
export function DiscoveryExplainer() {
  return (
    <section className="mt-12 border-t border-white/[0.08]" aria-labelledby="discovery-explainer-heading">
      <div className="grid gap-10 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-20 lg:pt-16">
        <div className="max-w-2xl">
          <h2 id="discovery-explainer-heading" className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            A shorter route to movie night
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">
            Search by title, actor, or theme. Narrow by occasion, runtime, genre, or verified provider, then preview a trailer and save a local shortlist.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a href="/movie-night" className="btn btn-primary">
              How to pick a movie tonight
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="/about" className="btn btn-secondary">
              About StreamFlicker
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

        <ul className="space-y-4 text-sm leading-relaxed text-zinc-300" aria-label="StreamFlicker discovery features">
          <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
            <Search className="mt-0.5 shrink-0 text-rose-400" size={19} aria-hidden="true" />
            <span>Find a familiar title, or start from a shortcut such as date night or a theme like zombie movies.</span>
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
            <Check className="mt-0.5 shrink-0 text-rose-400" size={19} aria-hidden="true" />
            <span>The PG-13 and under filter narrows the field, but it can't guarantee a movie suits every child.</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
