import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/*
 * Static guards for the rules from the October 2026 UI review. They scan the
 * source rather than render it, so they are cheap to run on every `npm test`
 * and they fail the moment someone reintroduces a pattern the review removed.
 */
const sourceRoot = 'src';

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'data' ? [] : walk(path);
    return [path];
  });
}

const files = walk(sourceRoot)
  .filter((path) => /[.](tsx|ts|css)$/.test(path))
  .map((path) => ({ path: relative('.', path).split('\\').join('/'), text: readFileSync(path, 'utf8') }));
const markup = files.filter(({ path }) => path.endsWith('.tsx'));
const matches = (pattern, text) => [...text.matchAll(pattern)].map(([match]) => match);
const find = (pattern) => files.flatMap(({ path, text }) => matches(pattern, text).map((match) => `${path}: ${match}`));

// Pattern rules. Every rule names samples it must flag and samples it must leave alone, so a
// pattern that quietly stops matching (a typo, an over-tight lookahead) fails here before it
// can wave a violation through.
const PATTERN_RULES = [
  {
    pattern: /text-\[(?:[0-9]|1[01])px\]/g,
    message: 'Text must be at least 12px (use text-xs). 75% of the home page text used to be 9 to 11px.',
    flagged: ['text-[9px]', 'text-[10px]', 'text-[11px]'],
    allowed: ['text-[12px]', 'text-[15px]', 'text-xs'],
  },
  {
    // On the near-black page zinc-500 is 4.2:1, zinc-600 2.6:1 and zinc-700 1.9:1; all fail WCAG AA.
    // The 900 and 950 steps stay allowed because they are the dark text on light buttons.
    pattern: /\b(?:text|placeholder)-(?:zinc|gray|slate|neutral|stone)-(?:500|600|700|800)(?![0-9])/g,
    message: 'Use text-ink-2 / text-ink-3 instead of mid and dark greys for text and icons',
    flagged: ['text-zinc-500', 'text-zinc-600', 'text-zinc-700', 'placeholder-zinc-500', 'hover:text-zinc-600', 'text-zinc-500/70', 'text-slate-600', 'text-gray-800'],
    allowed: ['text-zinc-400', 'text-zinc-5000', 'border-zinc-500', 'text-zinc-900', 'text-zinc-950', 'bg-zinc-700'],
  },
  {
    // Hover must darken, never lighten: white on rose-500 is 3.75:1, on rose-600 4.5:1, on rose-700 6:1.
    pattern: /hover:bg-rose-500(?![0-9/])/g,
    message: 'Primary button hover must go darker (hover:bg-rose-700)',
    flagged: ['hover:bg-rose-500 ', 'hover:bg-rose-500"'],
    allowed: ['hover:bg-rose-500/10', 'hover:bg-rose-700'],
  },
  {
    pattern: /\bbg-emerald-600\b/g,
    message: 'White text on emerald-600 is 3.65:1; use emerald-700',
    flagged: ['bg-emerald-600 text-white'],
    allowed: ['bg-emerald-700', 'bg-emerald-500'],
  },
  {
    // Controls that dead-ended stay removed: the reminder bell never notified anyone.
    pattern: /onSetAlert|AlertsModal|streamflicker_alert_preferences/g,
    message: 'The reminder feature was removed',
    flagged: ['onSetAlert={set}', "import { AlertsModal } from './AlertsModal'", "'streamflicker_alert_preferences'"],
    allowed: ['onSetFilter', 'AccountSettingsModal'],
  },
  {
    pattern: /[A-Za-z0-9._%+-]+@gmail\.com/g,
    message: 'No personal address may be hard-coded; contact details come from VITE_CONTACT_EMAIL',
    flagged: ['someone@gmail.com', 'first.last+tag@gmail.com'],
    allowed: ['support@example.com', 'gmail.com'],
  },
  {
    // WCAG 2.5.3 Label in Name: speech-control users say the words they see, so an accessible name starts with the
    // visible text ("Add to watchlist: Inception"), never "Add Inception to watchlist".
    pattern: /`(?:Add|Remove|Save) \$\{[^}]+\} (?:to|from) watchlist`/g,
    message: 'Start accessible names with the visible words, e.g. `Add to watchlist: ${movie.title}`',
    flagged: ['`Add ${movie.title} to watchlist`', '`Remove ${movie.title} from watchlist`', '`Save ${movie.title} to watchlist`'],
    allowed: ['`Add to watchlist: ${movie.title}`', '`Remove from watchlist: ${movie.title}`', "'Add to watchlist'"],
  },
  {
    // localeCompare with a locale or options builds a new collator on every call: sorting the 1,799-title catalog took
    // 63 ms that way and 1.3 ms with one cached Intl.Collator (a 217 ms long task on a throttled phone).
    pattern: /localeCompare\([^)]*,\s*['"]/g,
    message: 'Use a module-level Intl.Collator instead of localeCompare with a locale or options',
    flagged: ["a.localeCompare(b, 'en', { numeric: true })", 'a.title.localeCompare(b.title, "en")'],
    allowed: ['a.localeCompare(b)', 'collator.compare(a.title, b.title)', "(a ?? '').localeCompare(b ?? '')"],
  },
  {
    pattern: /animate-scale-up|custom-scrollbar/g,
    message: 'These classes are not defined anywhere in Tailwind 4 or our CSS',
    flagged: ['animate-scale-up', 'custom-scrollbar'],
    allowed: ['animate-pulse', 'scrollbar-width'],
  },
  {
    // October 10 polish: rose is the only accent. Emerald means saved or done, amber means careful;
    // sky, blue, orange and friends had crept in as decoration and made every dialog a different colour.
    pattern: /\b(?:text|bg|border|ring|from|via|to|shadow|outline|fill|stroke)-(?:sky|blue|cyan|teal|indigo|violet|purple|fuchsia|orange|lime|green|yellow)-[0-9]/g,
    message: 'Use rose for accents (emerald only for saved or done, amber only for warnings)',
    flagged: ['text-sky-400', 'bg-sky-500/10', 'border-blue-400/30', 'text-orange-400', 'hover:bg-green-600'],
    allowed: ['text-rose-400', 'bg-emerald-500/15', 'border-amber-500/20', 'text-ink-2', 'bg-zinc-900'],
  },
  {
    // Primary buttons come from .btn-primary in src/index.css: one height, one radius, one hover. A hand-rolled
    // rose button is how six slightly different primaries appeared. (Decorative rose tiles use rose-700.)
    pattern: /(?<!selection:)\bbg-rose-600\b(?![/-])/g,
    message: 'Use className="btn btn-primary" instead of a hand-styled rose button',
    flagged: ['rounded-xl bg-rose-600 px-4', 'bg-rose-600 hover:bg-rose-700'],
    allowed: ['btn btn-primary', 'bg-rose-600/20', 'selection:bg-rose-600 selection:text-white', 'bg-rose-700'],
  },
  {
    // The white "Where to watch" button competed with the real primary action next to it.
    pattern: /\bbg-zinc-100\b(?![/-])/g,
    message: 'No white buttons: use btn-secondary (or btn-primary for the main action)',
    flagged: ['rounded-xl bg-zinc-100 px-4 text-zinc-950', 'bg-zinc-100 text-zinc-950'],
    allowed: ['bg-zinc-100/10', 'text-zinc-100', 'bg-zinc-900'],
  },
];

for (const { pattern, message, flagged, allowed } of PATTERN_RULES) {
  for (const sample of flagged) assert.ok(matches(pattern, sample).length > 0, `Guard ${pattern} no longer flags "${sample}"`);
  for (const sample of allowed) assert.equal(matches(pattern, sample).length, 0, `Guard ${pattern} wrongly flags "${sample}"`);
  assert.deepEqual(find(pattern), [], message);
}

// Tokens: real contrast on the page background (#070709) and the card background (#0e0e13).
const css = readFileSync(join(sourceRoot, 'index.css'), 'utf8');
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (foreground, background) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
};
assert.ok(contrast('#ffffff', '#000000') > 20.9 && contrast('#ffffff', '#000000') < 21.1, 'The contrast helper must report 21:1 for white on black');
for (const token of ['--color-ink-2', '--color-ink-3']) {
  const value = css.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  assert.ok(value, `${token} must be defined in src/index.css`);
  for (const background of ['#070709', '#0e0e13']) {
    assert.ok(contrast(value, background) >= 4.5, `${token} (${value}) must be at least 4.5:1 on ${background}`);
  }
}

// Glass effects: the build used to drop the unprefixed backdrop-filter when both were declared.
assert.doesNotMatch(css, /-webkit-backdrop-filter/, 'Declare only backdrop-filter; the build adds the -webkit- prefix itself');
assert.doesNotMatch(css, /\.glass-card/, 'Blurring every movie card costs GPU time and buys nothing on a flat background');
assert.match(css, /color-scheme:\s*dark/, 'Native controls and scrollbars must follow the dark theme');
assert.doesNotMatch(css, /background-attachment:\s*fixed/, 'Fixed backgrounds force repaints while scrolling');

// Trailers use YouTube's privacy-enhanced host, as the consent copy promises.
const trailerModal = readFileSync(join(sourceRoot, 'components', 'TrailerModal.tsx'), 'utf8');
assert.match(trailerModal, /youtube-nocookie\.com\/embed/, 'The trailer embed must use youtube-nocookie.com');
assert.doesNotMatch(trailerModal, /www\.youtube\.com\/embed/, 'The trailer embed must not use the standard YouTube host');

// Removed files stay removed.
for (const removed of ['components/AlertsModal.tsx', 'components/LegalModal.tsx', 'components/HeroBanner.tsx', 'App.css']) {
  assert.equal(existsSync(join(sourceRoot, removed)), false, `${removed} was removed and must not return`);
}

// Cards keep one tab stop for the trailer: no second control that opens the same dialog.
const card = readFileSync(join(sourceRoot, 'components', 'MovieCard.tsx'), 'utf8');
assert.equal((card.match(/onWatchTrailer\(movie\)/g) ?? []).length, 1, 'A card has exactly one control that opens the trailer');
assert.match(card, /after:absolute after:inset-0/, 'The card is one stretched link');

// Trust and legal: real pages and the TMDB notice, from one shared footer on every page.
const app = readFileSync(join(sourceRoot, 'App.tsx'), 'utf8');
const chrome = readFileSync(join(sourceRoot, 'components', 'SiteChrome.tsx'), 'utf8');
for (const href of ['/privacy', '/terms', '/contact']) assert.match(chrome, new RegExp(`href="${href}"`), `The footer must link ${href}`);
assert.match(chrome, /\{TMDB_NOTICE\}/, 'The footer must carry the TMDB notice');
// TMDB's terms require their logo with the notice, less prominent than StreamFlicker's own (which is 40px tall).
assert.ok(existsSync(join('public', 'tmdb-logo.svg')), "TMDB's official logo must ship in public/");
const logo = chrome.match(/<img[^>]*src="\/tmdb-logo\.svg"[^>]*>/)?.[0];
assert.ok(logo, "The footer must show TMDB's logo beside the notice");
assert.match(logo, /height="12"/, "The TMDB logo stays small (12px), below StreamFlicker's own");
// About and the guide used to carry their own footers, without the logo; every page now renders the shared one.
for (const [name, source] of [
  ['App', app],
  ['About', readFileSync(join(sourceRoot, 'components', 'BusinessPage.tsx'), 'utf8')],
  ['movie-night guide', readFileSync(join(sourceRoot, 'components', 'MovieNightGuide.tsx'), 'utf8')],
  ['legal pages', readFileSync(join(sourceRoot, 'components', 'LegalPages.tsx'), 'utf8')],
]) {
  assert.match(source, /<SiteFooter\b/, `The ${name} must render the shared SiteFooter`);
  assert.doesNotMatch(source, /<footer\b/, `The ${name} must not build its own footer`);
}
for (const name of ['BusinessPage', 'MovieNightGuide', 'LegalPages']) {
  assert.match(readFileSync(join(sourceRoot, 'components', `${name}.tsx`), 'utf8'), /<SiteHeader\b/, `${name} must render the shared SiteHeader`);
}

// The shared controls exist, so components have something to reuse instead of restyling buttons by hand.
for (const selector of ['.btn', '.btn-primary', '.btn-secondary', '.btn-saved', '.icon-btn', '.chip', '.chip-count', '.tag', '.eyebrow', '.notice', '.notice-warn']) {
  assert.match(css, new RegExp(`\\${selector}\\s*[{,:]`), `src/index.css must define ${selector}`);
}

// The planner may suggest well-known titles that were matched to TMDB, always labeled. The lazy planner builds its own
// pool from the reviewed titles plus the loaded catalog (so App never imports the planner's rules and the first-load
// bundle stays lean, and the hero and rows can never see the wider pool). Opening the planner starts the catalog load,
// and it is told when loading has settled (finished or failed).
const planner = readFileSync(join(sourceRoot, 'components', 'MovieNightPlanner.tsx'), 'utf8');
assert.match(planner, /Checked on TMDB/, 'A checked pick must carry a visible label');
assert.match(planner, /well-known titles we matched to TMDB/, 'The footer must say where checked picks come from');
assert.match(planner, /catalogReady/, 'The planner must know whether more titles are still arriving');
assert.match(planner, /buildPlannerPool\(reviewedMovies, catalog\)/, 'The planner builds its pool from the reviewed titles plus the catalog');
assert.match(app, /reviewedMovies=\{validatedCatalog\}/, 'The planner is handed the reviewed titles');
assert.match(app, /catalog=\{catalogComplete \? canonicalCatalog : NO_TITLES\}/, 'The planner is handed the loaded catalog, and nothing before it has loaded');
assert.match(app, /catalogReady=\{catalogSettled\}/, 'The planner is told when catalog loading has settled');
assert.match(app, /const catalogSettled = catalogComplete \|\| catalogStatus === 'error'/, 'A failed load must not leave the planner saying it is loading');
assert.match(app, /const needsFullCatalog = [^;]*showMovieNight/, 'Opening the planner starts the catalog load');
assert.doesNotMatch(app, /plannerPool|services\/movieNight/, 'App must not build a wider pool or import the planner rules: that keeps the hero and rows reviewed-only and the first load lean');

// The privacy page only promises what the deployment does: the measurement sentence is computed from
// config (click reporting can be switched on), and search words are admitted to reach the host's logs.
const legalPages = readFileSync(join(sourceRoot, 'components', 'LegalPages.tsx'), 'utf8');
assert.match(legalPages, /getMeasurementStatement\(/, 'The privacy page must take its measurement sentence from getMeasurementStatement');
assert.doesNotMatch(legalPages, /run our own analytics/, 'Do not hard-code "no analytics" in the privacy page; click reporting can be switched on');
assert.match(legalPages, /Search\.<\/strong>[\s\S]{0,700}?server logs/, 'The search paragraph must say search words can appear in server logs');

// Fonts are self-hosted: no third-party font request on the critical path.
assert.doesNotMatch(readFileSync('index.html', 'utf8'), /fonts\.(?:googleapis|gstatic)\.com/, 'Fonts must be self-hosted');

// Every image keeps an accessible name.
for (const { path, text } of markup) {
  for (const image of text.matchAll(/<img\b[^>]*>/g)) {
    assert.match(image[0], /\balt=/, `${path}: every <img> needs an alt attribute (use alt="" for decoration)`);
  }
}

console.log(`Passed UI guard checks across ${files.length} source files.`);
