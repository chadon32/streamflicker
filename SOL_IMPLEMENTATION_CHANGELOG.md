# StreamFlicker Implementation Changelog

Date: 2026-07-28  
Scope: local implementation only; no deployment, commit, push, production data, email, notification, or webhook action

## Classification and filter follow-up

The 2026-07-28 follow-up added a canonical synopsis-evidence classifier, removed unsupported public tags, replaced unreliable origin categories with eras, added result counts, centralized filter predicates, removed fabricated live-search provider/tag fallbacks, and added exhaustive facet tests. Files: `src/services/catalogClassification.ts`, `src/App.tsx`, `src/components/FilterBar.tsx`, `src/services/tmdbApi.ts`, and `scripts/run-tests.mjs`. No migration or external API credential is required; rollback consists of removing the canonical preparation/filter calls and restoring the former FilterBar props, but that would re-expose the documented synthetic classifications.

## Changes

| Change | Reason | Previous behavior | New behavior | Files affected | Tests performed | Rollback notes |
| --- | --- | --- | --- | --- | --- | --- |
| Responsive header and navigation | Menu was outside the 320 px viewport and search collapsed to 85 px | Mobile navigation and account actions were inaccessible or cramped | Header wraps, search takes a mobile row, menu remains visible through tablet widths, and sign-in/out appears in the drawer | `src/components/Navbar.tsx`, `src/index.css` | Browser at 320/375/430/768/1440/1920; menu interaction | Revert Navbar layout/classes; no data migration |
| Responsive, user-controlled hero | Large gap, mobile title collision, small controls, and automatic movement | Hero auto-advanced and mobile actions/controls competed for space | No autoplay; compact top spacing; responsive height/type; 44 px controls positioned away from title; focused CTAs | `src/components/HeroCarousel.tsx`, `src/components/HeroBanner.tsx`, `src/App.tsx` | Responsive screenshots, control bounds, build/lint | Revert hero files and spacing classes |
| Truthful catalog and availability copy | UI asserted “match,” popularity, exact fallback price, alerts, and availability without evidence | Unsupported claims appeared throughout cards, hero, modal, and metadata | “Catalog score,” “catalog highlights,” and “check availability” language; false price and match claims removed | `src/App.tsx`, `src/components/HeroCarousel.tsx`, `HeroBanner.tsx`, `MovieCard.tsx`, `TrailerModal.tsx`, `index.html` | Browser text/metadata inspection, build | Copy-only rollback; do not restore unsupported claims without evidence |
| Accessible dialog system | Modals lacked consistent roles, focus containment, Escape handling, focus restoration, and body lock | Keyboard/screen-reader behavior varied by modal | Shared hook provides focus entry/loop/restore, Escape, and body lock; all modals are labelled dialogs with backdrop handling | `src/hooks/useAccessibleDialog.ts`; all modal components | Shift+Tab loop, Escape close, body-overflow restoration, DOM accessibility snapshots | Remove hook wiring and restore per-modal behavior only if replacing it with equivalent accessibility |
| Semantic controls and navigation | Footer used clickable spans; poster actions were pointer-only; icon controls lacked names | Some actions were not keyboard or screen-reader operable | Native buttons/links, skip link, regions/headings, focus styles, accessible names and state | `src/App.tsx`, `Navbar.tsx`, `FilterBar.tsx`, `MovieCard.tsx`, `MovieRow.tsx`, `src/index.css` | Keyboard/browser snapshots, lint/build | Revert by component; preserve native semantics in any replacement |
| Provider contrast and normalization | White Apple chip had unreadable text; 18 duplicate entries produced React key errors; logos were inconsistent | Duplicate links/errors and contrast defects | Runtime ID deduplication, canonical provider name/logo/color, and luminance-based text color | `src/lib/color.ts`, `src/data/catalog.ts`, `src/App.tsx`, movie/hero/modal components | Catalog tests, final console (no errors), visual inspection | Remove normalization/helper; raw catalog defects will reappear |
| Shareable/restorable movie links | Shared `?movie=` links did not hydrate application state | Refreshing or opening a shared URL showed the home screen | Open/close/back/forward synchronize the selected movie; title/canonical metadata follows it | `src/App.tsx`, `src/components/ShareModal.tsx` | Direct URL opened correct dialog/title; Escape removed parameter; back-state logic inspected | Remove URL effects and restore non-addressable modal state |
| Privacy-gated YouTube trailer | Opening a modal immediately created an autoplaying third-party iframe | YouTube received a request before a deliberate play choice | Backdrop preview is first; `youtube-nocookie.com` iframe is created only after “Load trailer” | `src/components/TrailerModal.tsx` | Deep link produced zero iframes; explicit load control present | Revert conditional iframe state; privacy regression would return |
| Honest local alert preferences | A timer simulated a remote alert/email success | UI implied an email/automatic alert despite no backend | Validated, deduplicated preference is saved to local storage with explicit local-only/no-send copy | `src/components/AlertsModal.tsx`, `README.md` | Code path/lint/build; signed-out modal flow inspected | Remove storage key and modal changes; no server data exists |
| Defensive watchlist persistence | Stored JSON was trusted and changes in another tab were not observed | Malformed state could enter UI; other-tab updates stayed stale | Shape validation, centralized key, timer cleanup, and storage-event listener | `src/App.tsx` | Add/open/remove UI path; catalog build/tests; event path reviewed | Revert parser/listener; existing browser data remains |
| Correct filter/home reset logic | Region-only selection still rendered home rows; reset omitted region | Filter state and presentation disagreed | Region participates in filtered/home state and all reset actions | `src/App.tsx`, `src/components/FilterBar.tsx`, `Navbar.tsx` | International filter showed 1,477-result grid and reset returned home state | Revert `isHomeView`/reset changes |
| Safer, more relevant search | Requests could race; fuzzy matching and decade logic were overly permissive | Old results could win and unrelated content ranked highly | Debounced TMDB calls are abortable; bounded typo matching and combined year/concept constraints reduce false matches | `src/App.tsx`, `src/services/tmdbApi.ts`, `src/services/smartSearch.ts`, `Navbar.tsx` | Automated semantic/decade/typo tests; browser “zombie outbreak” flow | Revert service functions together; no stored data impact |
| Lazy catalog shell and recovery state | The 2.2 MB main chunk included the catalog and showed no recoverable load failure | Application shell waited on one large module | Catalog is dynamically imported with skeleton, failure message, and retry; off-screen rows use `content-visibility` | `src/App.tsx`, `src/data/catalog.ts`, `src/data/movies.ts`, `src/index.css` | Production bundle measurement; loading skeleton observed; build | Restore static import and remove catalog-status branches |
| Outbound URL protocol guard | Affiliate helper would preserve an arbitrary URL protocol | A future untrusted caller could produce a non-web link | Only HTTP(S) URLs are returned; invalid input becomes `#` | `src/services/affiliate.ts` | Unit test with a `javascript:` URL plus all catalog URLs | Revert protocol check only if every caller is permanently trusted |
| SEO and crawl baseline | Metadata contained unsupported claims; no robots file; modal URLs lacked canonical state | Generic title/description and weak social/canonical data | Accurate HTML/runtime metadata, title-specific canonical URLs, Open Graph/Twitter fields, and `robots.txt` | `index.html`, `src/App.tsx`, `public/robots.txt` | Build and browser document-title/canonical inspection | Remove Helmet additions and robots file; production hostname still required for sitemap |
| Environment and project documentation | `.env` was not ignored and README was the Vite template | Future secret inclusion risk and no application-specific setup guidance | `.env` rules, value-free example, client-visible-key warning, real commands, and product/data boundaries | `.gitignore`, `.env.example`, `README.md` | Secret signature scan; file review; build | Revert documentation/ignore entries; never commit an existing `.env` |
| Automated service/catalog tests | No test script existed | Search/link/data regressions had no executable guard | Dependency-free test command validates affiliate logic, search behavior, and all 1,799 records | `package.json`, `scripts/run-tests.mjs` | `npm test` passed | Remove script and package command; no runtime effect |
| Toast and async cleanup | Toast timers could overlap and aborted searches logged as errors | Potential stale cleanup/noisy cancellation | Timer ref is replaced/cleaned; `AbortError` is ignored | `src/App.tsx`, `src/services/tmdbApi.ts` | Lint/build and repeated search interaction | Revert effects; watch for stale callbacks |
| Authentication error and form hardening | Raw Supabase errors were rendered; forms lacked complete autocomplete guidance | Provider details could leak and browser assistance was weaker | Generic failure copy, labelled status, email/password autocomplete, minimum password length, safe button types | `src/components/AuthModal.tsx` | Modal accessibility/focus inspection; build/lint | Revert copy/attributes only after reviewing enumeration risk |

## Configuration instructions

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the intended public Supabase project.
3. Optionally set `VITE_TMDB_API_KEY`, or enter a restricted browser client key in Settings.
4. Run `npm ci`, then `npm run dev`.
5. Before any production release, configure Supabase redirect URLs, email templates, rate limits/abuse protection, and reviewed Row Level Security.
6. Configure HTTPS and reviewed CSP, HSTS, frame, referrer, MIME-sniffing, and permissions headers at the eventual host.

Do not put a service-role key, private API secret, password, or unrestricted credential in a `VITE_*` variable. Vite embeds these values in browser-delivered JavaScript.

## Migration instructions

No database or data migration was created. Browser-local data remains under its existing keys:

- `streamflicker_watchlist`
- `streamflicker_my_services`
- `streamflicker_affiliate_config`
- `streamflicker_tmdb_key`

New local alert preferences use `streamflicker_alert_preferences`. The format is local-only and should not be treated as a future server schema without validation and an explicit migration design.

## Verification record

- `npm ci --ignore-scripts`: passed; lockfile unchanged.
- `npm run build`: passed; TypeScript passed; final main JS 519.89 kB (147.74 kB gzip) and lazy catalog 1,713.47 kB (386.42 kB gzip).
- `npm run lint`: passed.
- `npm test`: passed across service/search logic and 1,799 catalog records; reports 18 normalized duplicate provider entries.
- `npm audit --json`: 0 known vulnerabilities.
- High-confidence secret signature scan: 0 findings; no values printed.
- Browser: primary local journeys, dialog keyboard behavior, deep links, responsive states, and final console passed.
- Tests failed in final state: 0.

Not available or not authorized: formatter, formal E2E framework, automated accessibility scanner, Lighthouse/CWV lab, real email/signup/recovery, licensed provider availability, production headers, database/RLS inspection, deployment, commit, and push.

## General rollback

There is no Git metadata in this workspace, so automated revision rollback is unavailable. Back up the current workspace before manual rollback. The changes are intentionally grouped by concern above and require no database reversal. If rolling back deep links or catalog loading, revert the related `App.tsx` effects and component contract together. If rolling back local alert preferences, remove the `streamflicker_alert_preferences` browser key manually only if the user wants that local data discarded.
