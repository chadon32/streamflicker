import {
  ArrowRight,
  Check,
  Clock3,
  Film,
  Search,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

/**
 * A static, route-friendly guide for the practical question behind Movie Night.
 * It intentionally has no client state so it can render in an SSR shell as well
 * as in the Vite app.
 */
export function MovieNightGuide() {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#070709] text-zinc-100 selection:bg-rose-600 selection:text-white">
      <a
        href="#guide-content"
        className="fixed left-4 top-3 z-[110] -translate-y-20 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        Skip to movie-night guide
      </a>
      <header className="border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="StreamFlicker home">
            <img
              src="/streamflicker-logo.svg"
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-rose-600/25"
            />
            <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-white sm:text-2xl">
              Stream<span className="text-rose-500">Flicker</span>
            </span>
          </a>

          <nav className="flex shrink-0 items-center gap-3 text-sm font-semibold text-zinc-400 sm:gap-6" aria-label="Guide navigation">
            <a className="hidden transition-colors hover:text-white sm:inline" href="/about">
              About
            </a>
            <a
              href="/"
              className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-rose-600 px-3 py-2.5 text-white transition-colors hover:bg-rose-500 active:scale-[0.98] sm:px-4"
            >
              Open the app
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </header>

      <main id="guide-content" aria-labelledby="movie-night-guide-heading">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <li>
                <a className="transition-colors hover:text-white" href="/">Movie discovery</a>
              </li>
              <li aria-hidden="true" className="text-zinc-700">/</li>
              <li aria-current="page" className="text-zinc-300">Movie-night guide</li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
              Movie night guide
            </p>
            <h1
              id="movie-night-guide-heading"
              className="font-display text-5xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl"
            >
              How to pick a movie for tonight
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Start with the kind of night you have, narrow the time and genre, then check the title before you press play.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/?plan=1"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-rose-950/40 transition-colors hover:bg-rose-500 active:scale-[0.98]"
              >
                Help me pick a movie
                <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/70 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Browse movies
              </a>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.08] bg-zinc-950/70" aria-labelledby="movie-night-path-heading">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <h2 id="movie-night-path-heading" className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
                Make the choice smaller
              </h2>
              <p className="mt-5 text-base leading-relaxed text-zinc-400 sm:text-lg">
                The planner keeps the useful decisions together, so a broad mood becomes a short list you can act on.
              </p>
            </div>

            <ol className="mt-12 grid gap-0 border-y border-white/[0.08] md:grid-cols-5 md:divide-x md:divide-white/[0.08]">
              <li className="flex gap-4 border-b border-white/[0.08] py-7 md:block md:border-b-0 md:px-5 md:first:pl-0 md:last:pr-0">
                <span className="font-display text-xl font-bold text-rose-400">01</span>
                <div className="mt-0 md:mt-6">
                  <UsersRound size={22} className="hidden text-rose-400 md:block" aria-hidden="true" />
                  <h3 className="font-display text-xl font-bold text-white">Name the night</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">Choose family night, date night, friends night, or just me.</p>
                </div>
              </li>
              <li className="flex gap-4 border-b border-white/[0.08] py-7 md:block md:border-b-0 md:px-5">
                <span className="font-display text-xl font-bold text-rose-400">02</span>
                <div className="mt-0 md:mt-6">
                  <Clock3 size={22} className="hidden text-rose-400 md:block" aria-hidden="true" />
                  <h3 className="font-display text-xl font-bold text-white">Set the runtime</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">Pick any length, 100 minutes or less, 101 to 150, or over 150.</p>
                </div>
              </li>
              <li className="flex gap-4 border-b border-white/[0.08] py-7 md:block md:border-b-0 md:px-5">
                <span className="font-display text-xl font-bold text-rose-400">03</span>
                <div className="mt-0 md:mt-6">
                  <Film size={22} className="hidden text-rose-400 md:block" aria-hidden="true" />
                  <h3 className="font-display text-xl font-bold text-white">Pick a vibe</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">Use a genre when you know the feeling you want to keep.</p>
                </div>
              </li>
              <li className="flex gap-4 border-b border-white/[0.08] py-7 md:block md:border-b-0 md:px-5">
                <span className="font-display text-xl font-bold text-rose-400">04</span>
                <div className="mt-0 md:mt-6">
                  <ShieldCheck size={22} className="hidden text-rose-400 md:block" aria-hidden="true" />
                  <h3 className="font-display text-xl font-bold text-white">Check a service</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">Use a provider only when the title has verified availability data.</p>
                </div>
              </li>
              <li className="flex gap-4 py-7 md:block md:px-5 md:last:pr-0">
                <span className="font-display text-xl font-bold text-rose-400">05</span>
                <div className="mt-0 md:mt-6">
                  <Check size={22} className="hidden text-rose-400 md:block" aria-hidden="true" />
                  <h3 className="font-display text-xl font-bold text-white">Make a shortlist</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">Preview a trailer, save a title, and decide where to continue.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:px-8 lg:py-24" aria-labelledby="night-fit-heading">
          <div>
            <h2 id="night-fit-heading" className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
              Match the movie to the night
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              One guide covers the common ways a movie night starts. Pick the closest fit, then broaden it if the shortlist feels too narrow.
            </p>

            <div className="mt-10 space-y-0 border-t border-white/[0.08]">
              <article className="grid gap-3 border-b border-white/[0.08] py-6 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <h3 className="font-display text-xl font-bold text-white">Family night</h3>
                <p className="text-sm leading-relaxed text-zinc-400">Start with the family option, then check the rating and details for the people watching. A family filter is a useful starting point, not a promise of suitability for every child.</p>
              </article>
              <article className="grid gap-3 border-b border-white/[0.08] py-6 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <h3 className="font-display text-xl font-bold text-white">Date night</h3>
                <p className="text-sm leading-relaxed text-zinc-400">Choose date night when you want romance or relationship-driven stories, then use runtime to protect the time you have together.</p>
              </article>
              <article className="grid gap-3 border-b border-white/[0.08] py-6 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <h3 className="font-display text-xl font-bold text-white">Quick watch</h3>
                <p className="text-sm leading-relaxed text-zinc-400">Choose 100 minutes or less when the evening is short. If you already have a theme in mind, open the planner and use its runtime choice to narrow the result.</p>
              </article>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-rose-500/25 bg-rose-950/20 p-7 sm:p-9" aria-labelledby="clue-heading">
            <Search size={24} className="text-rose-300" aria-hidden="true" />
            <h2 id="clue-heading" className="mt-6 font-display text-3xl font-black tracking-[-0.03em] text-white">Already have a clue?</h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
              Search the home page by title, actor, or theme. Quick tags can take you straight to a focused route, including zombie movies.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <a
                href="/?q=zombie"
                className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-100 transition-colors hover:border-rose-300/60 hover:bg-rose-500/20"
              >
                Try zombie movies
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a
                href="/"
                className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900/65 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Search the catalog
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </aside>
        </section>

        <section className="border-y border-white/[0.08] bg-zinc-950/70" aria-labelledby="next-step-heading">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-8 lg:py-20">
            <div>
              <h2 id="next-step-heading" className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">Check before you press play</h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">A good shortlist still needs one practical check: what is available for you right now?</p>
            </div>
            <ul className="space-y-4 text-sm text-zinc-300">
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <Check className="mt-0.5 shrink-0 text-emerald-400" size={18} aria-hidden="true" />
                Open the title&apos;s provider links and recheck your region before leaving the guide.
              </li>
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <Check className="mt-0.5 shrink-0 text-emerald-400" size={18} aria-hidden="true" />
                Availability can change by region and time. StreamFlicker does not host movies.
              </li>
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <Check className="mt-0.5 shrink-0 text-emerald-400" size={18} aria-hidden="true" />
                Guest watchlists stay on this device. They are not cross-device synced.
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="movie-night-faq-heading">
          <div className="max-w-2xl">
            <h2 id="movie-night-faq-heading" className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">Movie night questions</h2>
            <p className="mt-5 text-base leading-relaxed text-zinc-400 sm:text-lg">A few details worth knowing before you choose.</p>
          </div>

          <div className="mt-10 max-w-4xl border-t border-white/[0.08]">
            <details className="group border-b border-white/[0.08] py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-bold text-white marker:hidden">
                What if I only know the kind of night?
                <span aria-hidden="true" className="text-rose-300 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">Open Help me pick a movie and choose Family night, Date night, Friends night, or Just me. Add a runtime and genre only if they matter.</p>
            </details>
            <details className="group border-b border-white/[0.08] py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-bold text-white marker:hidden">
                Does the family filter guarantee a safe choice?
                <span aria-hidden="true" className="text-rose-300 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">No. Family mode filters out some higher-risk titles, but it cannot guarantee suitability for every child. Review the rating and title details for your group.</p>
            </details>
            <details className="group border-b border-white/[0.08] py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-bold text-white marker:hidden">
                Can StreamFlicker play the movie?
                <span aria-hidden="true" className="text-rose-300 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">StreamFlicker does not host movies. It opens trailers and provider links, and availability may change with your region and the time you check.</p>
            </details>
            <details className="group border-b border-white/[0.08] py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-bold text-white marker:hidden">
                Will my watchlist follow me to another device?
                <span aria-hidden="true" className="text-rose-300 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">No. Guest watchlists and movie-night plans are saved on this device and are not cross-device synced.</p>
            </details>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>StreamFlicker. Movie discovery for the moment before play.</p>
          <div className="flex flex-wrap items-center gap-5">
            <a className="inline-flex min-h-11 items-center transition-colors hover:text-white" href="/about">About StreamFlicker</a>
            <a className="inline-flex min-h-11 items-center gap-2 font-semibold text-zinc-300 transition-colors hover:text-white" href="/">
              Open movie discovery
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
