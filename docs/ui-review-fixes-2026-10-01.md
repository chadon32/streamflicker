# UI review fixes — October 1, 2026

## Scope

Implements the recommendations from the October 1, 2026 website review (visual design, UX, copy, responsiveness, accessibility, performance, SEO, trust, code quality). All changes are on `codex/seo-foundations-2026-09-22`. No accounts were created. With the owner's permission, two things were downloaded on October 5, 2026: TMDB's official logo (2 KB SVG, now in `public/tmdb-logo.svg`) and Lighthouse 13.5 (run with `npx`, not added to the project).

## Changes

### Trust and honesty of the data

| Before | After |
| --- | --- |
| The "checked" date was a month late: `Date.UTC` received the 1-based month, so Sep 23 displayed as Oct 23 | The calendar date is formatted directly; covered by a regression test |
| The 17 reviewed titles carried placeholder ratings and runtimes (Interstellar showed R, 2h 0m) while claiming TMDB as the source | All 17 carry the certification and runtime shown on their TMDB page (table below). A mismatch makes a title fail the trusted-catalog gate |
| The other 1,782 records carry bucketed placeholder ratings and runtimes that filters and labels treated as facts | Rating and runtime count only for `bundled-validated` or live TMDB records. Family, quick-watch and date-night logic, the planner, and card labels ignore placeholders; unreviewed cards omit runtime and rating |
| Share text read like a legal notice | "Title (Year) on StreamFlicker: trailer and where to watch" plus the link, with a short TMDB credit only when the data is live. Movie-night text lists titles and the review date |
| "Family" implied a safety guarantee | The filter is labelled "PG-13 and under" and says it cannot guarantee a title suits every child |

### Movie night planner and browsing

| Before | After |
| --- | --- |
| Option combinations could end in zero results with no explanation | Every option shows how many reviewed titles match, impossible options are disabled, and "Browse all" is offered when nothing fits |
| Shortcut chips appeared regardless of how many titles they returned | A chip appears only when it returns at least 12 titles. Today that is Date night (93) and Zombie movies (76); Family night (2) and Quick watch (4) are hidden |
| The grid had no ordering | "Sort by": Featured, Newest, Oldest, A to Z. Titles the catalog can prove are unreleased are hidden from browsing but still found by search |
| "Browse all" count could disagree with the grid | Both come from one rule. The page shows the build's count (1,798) until the catalog loads, then recounts |
| A shared `/?movie=` link could close itself when sign-in finished loading | The URL-to-dialog sync waits for auth and storage to settle |

### Hero, cards, navigation

| Before | After |
| --- | --- |
| On phones the hero hid the artwork behind a gradient and pushed the actions down | Artwork on top, then title, facts and one clear "Watch trailer" |
| Cards led with text, and two controls opened the same trailer | Poster-first cards with one tab stop (the title is a stretched link), a separate bookmark button and a "Where to watch" link |
| The hero context line repeated "Rated R" next to the R badge | It shows a warning only when it adds information, otherwise the genres |
| Header stacked many controls; the reminder bell never notified anyone; privacy and terms were modals | Slim header (61 px on phones, 81 px on wide screens) with a menu on phones. The bell is gone. `/privacy`, `/terms` and `/contact` are real, crawlable pages |
| Footer had no working navigation | About, Privacy, Terms, Contact, My streaming services, and Sign in (only when accounts are enabled and you are signed out), plus the TMDB notice and the Amazon disclosure when an Amazon tag is configured |

### Accessibility

| Before | After |
| --- | --- |
| 60 lines used 9 to 11 px text across 13 files (about 75% of the home page's text) | 12 px minimum on every audited page, enforced by a test |
| Greys `zinc-500/600/700` measured 4.2, 2.6 and 1.9 : 1 on the page background | Two tokens, `text-ink-2` and `text-ink-3`, both at least 4.5 : 1 on the page and card backgrounds |
| Hover lightened primary buttons (white on rose-500 is 3.75 : 1); `emerald-600` was 3.65 : 1 | Hover darkens (rose-600 to rose-700); `emerald-700` |
| Native scrollbars and controls rendered light | `color-scheme: dark` |
| Search suggestions highlighted the keyboard position with a barely visible tint | Solid background plus a rose inset ring |

### Performance

| Before | After |
| --- | --- |
| Fonts came from Google (render-blocking third-party stylesheet and a second origin) | Inter and Outfit variable fonts are self-hosted; the two Latin files are preloaded |
| The whole 1,799-record catalog (332 kB compressed) downloaded before the first render | The home page runs on the 17 reviewed titles. The catalog loads after first paint, or immediately when search, browse, filters or a shared link need it |
| The Supabase SDK was part of startup | Loaded only when a session may exist or "Sign in" is clicked |
| Hashed assets had no long-lived cache header | `/assets/*` is cached for a year (`immutable`); responses also send `nosniff`, a strict referrer policy and a permissions policy |
| `.glass-card` blurred every movie card; a fixed background forced repaints | Both removed |

### SEO, trust, code

| Before | After |
| --- | --- |
| Canonical URLs, Open Graph URLs, sitemap and robots named `streamflicker.com`, which answers `308` to `www.streamflicker.com` | All of them name `https://www.streamflicker.com` (see "Decision to confirm") |
| No touch icon or web manifest | `apple-touch-icon`, 192 and 512 px icons, `manifest.webmanifest` |
| Trailers used the standard YouTube host while the consent copy promised privacy | `youtube-nocookie.com`, behind a click-to-load button |
| No TMDB attribution | The required notice is in the footer and the legal pages |
| Dead code | `HeroBanner`, `AlertsModal`, `LegalModal`, `App.css` and the Vite/React starter assets are deleted |

## Verified facts for the 17 reviewed titles

Read from each title's own TMDB page on October 1, 2026. The same table lives in `scripts/test-catalog-quality.mjs`, which fails if the catalog drifts from it.

| Title | Rated | Runtime | Title | Rated | Runtime |
| --- | --- | --- | --- | --- | --- |
| Blade Runner 2049 | R | 2h 44m | The Revenant | R | 2h 37m |
| Interstellar | PG-13 | 2h 49m | Mad Max: Fury Road | R | 2h 1m |
| Inception | PG-13 | 2h 28m | The Martian | PG-13 | 2h 21m |
| John Wick | R | 1h 41m | Prisoners | R | 2h 33m |
| Gone Girl | R | 2h 29m | World War Z | PG-13 | 1h 56m |
| Zombieland | R | 1h 28m | 28 Days Later | R | 1h 53m |
| Alien: Romulus | R | 1h 59m | Shutter Island | R | 2h 18m |
| Shaun of the Dead | R | 1h 39m | The Dark Knight | PG-13 | 2h 32m |
| I Am Legend | PG-13 | 1h 41m | | | |

## Measurements

Same machine, same script, both builds served by `vite preview` at 1440 × 900. The old build is `HEAD` (70a6aea). Bytes are compressed transfer sizes of first-party files. The embedded browser does not emit paint timings, so time-based metrics (LCP, TBT) were **not** measured.

| First visit to `/` | Before | After |
| --- | --- | --- |
| First-party bytes needed to render | 455 kB (3 requests) | 209 kB (5 requests) |
| JavaScript needed to render | 440 kB | 114 kB |
| Catalog download | 332 kB, before render | 332 kB, after first paint |
| Third-party requests on the critical path | Google Fonts stylesheet (render-blocking) | none |
| DOM nodes after load | 994 | 590 |
| Layout shift (localhost) | 0 | 0 |

Layout shift cannot be reproduced on localhost, where the catalog and fonts arrive instantly. Re-check it on the deployed site.

Responsive and accessibility checks on the final build:

- No horizontal page overflow at 320, 390, 768, 1100 and 1440 px.
- A scripted audit of `/`, `/about`, `/movie-night`, `/privacy`, `/terms`, `/contact` and the planner, watchlist, settings, trailer and share dialogs found no unnamed controls, skipped heading levels or duplicate IDs. Contrast was computed for every visible text node. Its only failures were one decorative breadcrumb slash (fixed) and the deliberately dimmed, disabled "Date night 0" planner option, which WCAG exempts. A follow-up search found one more decorative icon in the same grey (also fixed), and the guard now bans those greys.
- All 120 focusable elements on the home page show a focus indicator. The five audited dialogs are modal and labelled; the planner returns focus to its trigger and unlocks scrolling when closed with Escape.
- A cold load of `/?q=zombie` goes blank, loading, results; it never flashes "no results".
- That was a scripted audit; Lighthouse followed on October 5 (below).

### Lighthouse 13.5 (October 5, 2026)

Mobile defaults (simulated slow 4G, 4x CPU) against the local production build. Single runs vary a lot, so the home page figures are medians of three.

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` before the fixes below (one run) | 88 | 100 | 100 | 100 |
| `/` after | 96 (LCP 2.6 s, TBT 10 to 40 ms, CLS 0) | 100 | 100 | 100 |
| `/privacy` | 100 | 100 | 100 | 100 |

What it found, and what changed:

- **The hero image was requested only after React rendered it** (LCP 3.3 to 4.9 s). The home page's HTML now preloads the exact image set the hero renders (`getHeroImage` in `src/services/spotlight.ts`, shared by the hero and the static page). Three runs each: median LCP 2.6 s with the preload, 4.9 s without.
- **A 217 ms long task when the catalog arrived.** Sorting 1,799 titles with `localeCompare(…, 'en', options)` built a new collator per comparison: 63.5 ms on a desktop CPU, 1.3 ms with one cached `Intl.Collator`. Total blocking time went from 230 ms to 10 to 40 ms. A UI guard now rejects the slow form.
- **Label in Name (WCAG 2.5.3).** Watchlist buttons were announced as "Add *title* to watchlist" while showing "Add to watchlist"; they now start with the visible words ("Add to watchlist: *title*"), and the planner's Save toggle exposes `aria-pressed`. A UI guard rejects the old form.
- **Not changed:** "properly size images" (TMDB serves fixed widths; the next size down would look soft on 240 px cards), 41 KB of JavaScript that is unused on first load (search and filter code), and missing source maps (deliberate in production).

A separate finding while checking the build: Tailwind scans every folder git does not ignore, so test fixtures, docs, the video project and the iOS folders were adding 146 unused rules to every page. Excluding them (`@source not` in `src/index.css`) cut the CSS from 95.0 to 80.3 kB (15.3 to 13.5 kB gzipped); a before/after diff confirmed none of the removed classes is used by the app.

## Validation

- `npm test`, `npx tsc -b`, `npm run lint`, `npm run build` and `npm run test:seo` pass.
- New unit tests cover verified-facts gating, option counts, sorting and the unreleased rule, the browse count, the auth-session hint, contact-address parsing, and the privacy page's measurement sentence.
- `scripts/test-ui-guards.mjs` (also `npm run test:ui`, and part of `npm test`) scans the source for the rules above: text under 12 px, low-contrast greys, lightening hovers, the removed blur effects, the YouTube host, removed files, a single trailer control per card, footer links, no hard-coded personal address, no Google Fonts, and `alt` on every image. Each pattern lists samples it must flag and samples it must ignore, so a pattern that silently stops matching fails the suite. Mutating a scratch copy of the source with five of these violations made the guard fail each time.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_CONTACT_EMAIL` | Public address shown on `/contact` and in the legal pages | unset; the build warns and `/contact` says no address exists yet |
| `VITE_ACCOUNT_SIGNUP_ENABLED` | Allow new sign-ups | `false` |

## Needs you

1. **Set `VITE_CONTACT_EMAIL`** in Vercel (and in EAS secrets for iOS builds) to a role address you are happy to publish. No personal address is hard-coded anywhere.
2. **TMDB commercial agreement.** The official TMDB logo is now shown beside the notice (done October 5). If ads or affiliate links stay on, confirm you have TMDB's separate written agreement for revenue use.
3. **Have the privacy policy and terms reviewed.** They were written in plain language from what the code does: the watchlist and saved nights stay on the device, search goes through your server to TMDB (and the words can appear in Vercel's logs), trailers load from YouTube only after a click, accounts use Supabase, and ads and click reporting appear only if you switch them on. They are not legal advice. Two promises depend on your setup: the Ads paragraph says consent is requested where the law requires it, which holds only if you configure a consent tool before enabling AdSense (`.env.example` already says to), and the measurement sentence changes automatically when `VITE_AFFILIATE_CLICK_ENDPOINT` is set.
4. **Confirm accounts.** Sign-up is off because accounts do not sync anything yet. Existing accounts can still sign in. Set `VITE_ACCOUNT_SIGNUP_ENABLED=true` to bring sign-up back.
5. **Refresh the iOS app.** It ships the same web bundle: run `npm run ios:sync`, rebuild, and retake the App Store screenshots at the repo root, which show the old interface.
6. **After deploying**, resubmit the sitemap (it now lists `/privacy`, `/terms`, `/contact` on the `www` host) and re-measure LCP, CLS and TBT with Lighthouse or field data.

## Decision to confirm

Commit `7a560d5` aligned canonical URLs to the apex domain, but on October 1, 2026 `curl -I https://streamflicker.com/` returned `308` to `https://www.streamflicker.com/`, so every apex canonical pointed at a redirecting URL. The canonicals now match the live primary host (`www`). If you would rather make the apex primary, flip the redirect in Vercel's domain settings and set `SITE_ORIGIN` in `src/seo/pages.ts` plus the sitemap line in `public/robots.txt` back.

## Not done

- **Rating and runtime for the other 1,782 titles.** They stay hidden, not corrected, until the TMDB enrichment has been run with your token. The command, tests and runbook now exist: see [tmdb-enrichment.md](tmdb-enrichment.md).
- **Safari/iOS devices and sign-in flows.** Neither was available here (throttled performance runs were done with Lighthouse, above).
- **A rotating hero.** None of the 17 reviewed titles is flagged featured or trending (the 18 trending flags belong to other titles), so the hero has always resolved to Blade Runner 2049, at `HEAD` as well. Flag two or more and the carousel controls appear.

## New files

| File | Purpose |
| --- | --- |
| `src/components/LegalPages.tsx` | Privacy, Terms and Contact pages |
| `src/services/browseOrder.ts` | Sort modes, the unreleased rule, the browse count |
| `src/services/contact.ts`, `src/services/attribution.ts`, `src/services/privacyCopy.ts` | Contact-address parsing; the TMDB notice; the privacy page's measurement sentence, which depends on whether click reporting is configured |
| `src/lib/authHint.ts`, `src/hooks/useAuthSession.ts` | Decide whether the Supabase SDK is needed, and load it on demand |
| `src/hooks/useBrowserCatalog.ts` | Loads the full catalog after first paint or on demand |
| `src/data/homeCatalog.ts` | Generated: the 17 reviewed titles and the counts the home page needs |
| `src/fonts.css` | Self-hosted font imports |
| `scripts/test-ui-guards.mjs` | Static guards described above |
| `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest` | Home-screen icons and manifest |
