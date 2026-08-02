# StreamFlicker Complete Website Audit

Audit date: 2026-07-28  
Scope: local repository and local Vite runtime only  
Auditor posture: evidence-based code, configuration, data, build, and browser review

Post-audit update: the consumer-facing catalog now uses evidence-based canonical genres and microtags rather than the synthetic raw assignments identified below. Country/origin filters were replaced with objective year eras, and every visible filter now exposes a verified result count. See `SOL_MICROTAG_FILTER_AUDIT.md` for the updated coverage and limitations.

## 1. Executive summary

StreamFlicker is a dark, cinematic movie-discovery single-page application for browsing a bundled catalog, searching, filtering, watching trailers, checking third-party services, saving a local watchlist, sharing titles, signing in through Supabase, and configuring optional TMDB and affiliate settings. The likely primary conversion is an outbound service/affiliate click; trailer views, watchlist saves, shares, and account sign-in are secondary goals. This business-goal interpretation is inferred from the interface and was not supplied as a formal product requirement.

The codebase built and linted cleanly at baseline, and `npm audit` reported no known vulnerable packages. No critical or high-severity vulnerability was confirmed. The most material product risk is data trust: 1,794 of 1,799 records use placeholder directors and casts, 946 records share one fallback trailer ID, genre/tag assignments are heavily synthetic, and streaming availability/prices are static rather than verified live inventory. The earlier unprefixed audit documents claim stronger data quality than the repository supports and are superseded by this report.

The completed pass corrected confirmed mobile navigation, filtering, deep-linking, duplicate-provider, false-notification, accessibility, stale-search, metadata, and configuration problems. It also reduced the initial minified application chunk from 2,211.25 kB to 519.89 kB by moving the catalog into a separately loaded chunk, while adding honest loading and error states. The total JavaScript transferred when the entire catalog loads is not materially smaller; this is a critical-path split, not a claim of an end-to-end load-time improvement.

Remaining work should prioritize a provenance-controlled catalog and a licensed, region-aware availability source before adding engagement-heavy features. Production security headers, Supabase Row Level Security, real authentication delivery flows, analytics, Core Web Vitals, and external integrations could not be verified from this client-only repository.

## 2. Application overview

| Area | Observed behavior |
| --- | --- |
| Target user | Movie viewers deciding what to watch and where to check for it |
| Core problem | Search and discovery across a large horror/action/science-fiction-oriented catalog |
| Primary journey | Discover title → open trailer details → load trailer or open a provider |
| Retention journeys | Save watchlist, save local alert preference, share a deep link, sign in |
| Monetization | Configurable outbound affiliate parameters; actual commercial agreements are not verifiable |
| Data source | 1,799 bundled movie records plus optional client-side TMDB search |
| Persistence | Browser `localStorage` for watchlist, services, affiliate settings, TMDB key, and alert preferences |
| Authentication | Supabase browser client using URL and anonymous key from Vite variables |

## 3. Architecture summary

- React 19 and TypeScript 6 render a Vite 8 single-page application.
- Tailwind CSS 4 and `src/index.css` provide the visual system.
- `src/App.tsx` owns global UI state and dynamically imports the bundled catalog.
- `src/data/movies.ts` contains the 1,799-record static dataset; `src/data/catalog.ts` contains shared types and provider metadata.
- `src/services/smartSearch.ts`, `tmdbApi.ts`, and `affiliate.ts` contain search and outbound-link logic.
- Supabase is used only for browser authentication. No database schema, migration, server route, middleware, server action, or authorization policy is present.
- External browser calls are limited to optional TMDB search, Supabase auth, YouTube/YouTube-nocookie, poster/backdrop hosts, social sharing, and provider links.
- There is no CI workflow, Docker configuration, background job, scheduler, analytics SDK, error-monitoring SDK, feature-flag service, payment integration, upload flow, admin area, or server log.

Data flow:

`bundled catalog / optional TMDB → App state → search and filters → cards/modal → YouTube or provider links`

`Supabase config → browser auth client → session/user state`

`user preferences → validated local state → localStorage → storage-event synchronization`

## 4. Main user journeys

1. Browse the featured hero and curated horizontal rows.
2. Filter by origin, genre, provider, or micro-tag.
3. Search by title, people, year/decade, provider, or supported concepts.
4. Open a title, explicitly load a privacy-enhanced YouTube player, or check provider availability.
5. Add/remove a title from the browser-local watchlist.
6. Share a title-specific `?movie=<id>` URL.
7. Sign up or sign in using Supabase credentials.
8. Configure preferred services, optional client-visible TMDB key, and affiliate identifiers.
9. Save an alert preference locally. No email or automatic notification is sent.

Password recovery, profile editing, account deletion, exports/imports, administration, and real notification delivery do not exist.

## 5. Initial baseline results

| Check | Baseline evidence |
| --- | --- |
| Install | `npm ci --ignore-scripts` passed after the already-running project dev process holding a native binary was identified and stopped; lockfile hash remained unchanged |
| Build/type | `npm run build` passed; 2,211.25 kB main JS, 526.88 kB gzip; Vite warned about a chunk over 500 kB |
| Lint | `npm run lint` passed |
| Formatting | No formatting command or formatter configuration exists |
| Unit/integration/E2E | No test command or test harness existed |
| Dependencies | `npm audit --json` reported 0 known vulnerabilities |
| Secret scan | High-confidence private-key/token signature scan found no matches; secret values were never printed |
| Git | No Git metadata/history was available, so a Git diff, blame, and recent-history review were impossible |
| Runtime | Dev server started; no baseline fatal runtime exception |
| Desktop UI | 554 interactive elements; 71/71 sampled images lacked explicit HTML dimensions; footer used click handlers on spans; no dialog roles |
| 320 px UI | Menu control was outside the viewport; search was only 85 px wide; sampled controls frequently missed a 44 px target |
| Deep link | `?movie=scream-7-2026` did not open the title or set a title-specific document title |
| Console | Duplicate provider identifiers produced React duplicate-key errors |

## 6. Functional findings

| Finding | Evidence/status | Correction |
| --- | --- | --- |
| Mobile navigation inaccessible at 320 px | Confirmed in viewport measurement and screenshot | Header wraps safely; search receives its own mobile row; menu remains visible through tablet widths |
| Region filter left “home” rows visible | `isHomeView` omitted region state | Region is now part of home-state detection and reset logic |
| Movie share links were not restorable | Query parameter was written only by the share modal | Initial load, browser back/forward, open, and close now synchronize `?movie=` |
| Alerts claimed a simulated email/network success | Modal used a timer and success message without delivery infrastructure | Replaced with deduplicated local alert preferences and explicit “no notification sent” language |
| Duplicate provider records broke list identity | 18 duplicate provider entries; React console errors | Provider lists are normalized by provider ID at the application boundary |
| Search requests could finish out of order | Debounce lacked request cancellation | Added `AbortController`; aborted requests are ignored |
| Search relevance was overly broad | Fuzzy prefix matching and decade OR logic returned unrelated titles | Added bounded edit-distance matching, combined year/concept constraints, and concept-aware matching |
| Catalog had no recoverable load failure | Static import blocked rendering and had no error surface | Lazy catalog load now has a skeleton, error message, and retry action |
| Footer controls were not real buttons and opened the wrong legal tab | Clickable spans shared one generic action | Converted to buttons with tab-specific legal routing |
| Watchlist parse trusted arbitrary JSON | Only JSON parsing was performed | Stored entries are shape-checked; other-tab storage updates are observed |
| UI asserted unverifiable facts | “Match,” “most watched,” exact price fallback, and implied availability | Reworded to catalog score, catalog highlights, and “check availability”; removed invented fallback price |

Applicable flows absent from the product—payments, uploads, data editing, admin tools, password reset, exports/imports, and account deletion—were not treated as broken flows.

## 7. UI and UX findings

Confirmed baseline problems included excessive space above the hero, a clipped mobile menu, a cramped search field, long hero-title collisions, concealed card actions, weak touch targets, low-contrast text on light provider chips, auto-advancing content, and inconsistent modal behavior.

Implemented improvements:

- Preserved the established dark cinema brand while consolidating reusable surface, border, text, accent, focus, radius, shadow, and timing tokens.
- Reduced the header-to-hero gap and made hero heights/content responsive.
- Made the two primary hero actions visually dominant and full-width on mobile.
- Moved mobile carousel controls away from the title and made them 44×44 px.
- Exposed alert/share/watchlist actions without requiring hover.
- Added readable foreground-color selection for provider brand colors.
- Added a consistent glass panel treatment, clearer focus/hover/active states, loading skeleton, recoverable error state, empty state, success toast, and honest status copy.
- Prevented page-level horizontal overflow at 320, 375, 430, 768, 1440, and 1920 px in the tested states.

The final design is intentionally dense because this is a browsing utility, not a marketing landing page. The remaining horizontal scrolling inside filter and movie-row regions is intentional and does not create page-level overflow.

## 8. Accessibility findings

The review used the current [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/) as the reference, with particular attention to focus visibility, focus order, accessible names, reduced motion, and target size. This was a targeted manual/code review, not a formal conformance certification.

Implemented:

- Added a skip link and semantic main/region/heading relationships.
- Converted pseudo-controls to native buttons and made poster/title interactions keyboard-operable.
- Added dialog roles, modal semantics, labelled headings, initial focus, Tab/Shift+Tab containment, Escape close, backdrop close, body-scroll lock, and focus restoration.
- Added accessible names to icon-only controls and state with `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-live`, `role=status`, and `role=alert`.
- Added combobox/listbox/option and menu semantics.
- Added explicit image width/height hints and meaningful or deliberately empty alternative text.
- Added a strong global `:focus-visible` treatment and reduced-motion overrides.
- Stopped hero autoplay.
- Increased principal mobile controls to approximately 44 px or larger.
- Added email/password autocomplete hints and minimum password length.

Final manual keyboard evidence included successful Escape close, body-scroll restoration, and Shift+Tab wrapping from the dialog’s first control to its last. No automated axe/Pa11y suite, screen-reader lab, 200% zoom suite, or full color-contrast analyzer was available; those remain unverified.

## 9. Security findings

No critical or high-severity vulnerability was confirmed. `npm audit` reported zero known dependency vulnerabilities, no hardcoded private-key pattern was found, React renders text without `dangerouslySetInnerHTML`, and outbound links use `noopener noreferrer`.

### SEC-01 — Local environment file was not ignored

| Field | Detail |
| --- | --- |
| Severity/category | Low; CWE-540 (potential inclusion of sensitive information) |
| Affected file | `.gitignore` (baseline) |
| Input source | Developer-created `.env` file |
| Sensitive operation | Future source-control addition or archive distribution |
| Attack path | A nonpublic value placed in `.env` could be included if the directory is later committed or shared |
| Impact | Credential or configuration disclosure, depending on future contents |
| Exploitability | Requires a sensitive value and repository/archive exposure; Git history was absent, so no prior commit was verified |
| Confidence | High for the ignore gap; no secret disclosure was confirmed |
| Correction | Ignore `.env` and `.env.*`, retain `.env.example`, and document that all `VITE_*` values are browser-visible |
| Implemented/test | Yes; ignore rules and value-free example added; high-confidence secret scan passed |
| Remaining limitation | Existing local values were not rotated or inspected; any truly private credential must move behind a server |

### SEC-02 — Optional TMDB key is persisted in browser storage

| Field | Detail |
| --- | --- |
| Severity/category | Low; CWE-922 (insecure storage of sensitive information) |
| Affected files | `src/components/SettingsModal.tsx:15`, `src/services/tmdbApi.ts:30` |
| Input source | Settings form or `VITE_TMDB_API_KEY` |
| Sensitive operation | Read/write client-visible credential |
| Attack path | Same-origin script execution, browser profile access, or a malicious extension can read local storage |
| Impact | Key/quota misuse if an unrestricted credential is supplied |
| Exploitability | User must store a usable key and attacker must obtain local/same-origin script access |
| Confidence | High |
| Correction | Added an explicit warning, disabled autocomplete/spellcheck, documented restricted client keys, and recommend a server proxy for confidential keys |
| Implemented/test | Mitigation and documentation implemented; storage behavior retained for compatibility |
| Remaining limitation | The key remains browser-readable by design |

OWASP advises against placing sensitive information in local storage because same-origin script execution can read it; see the [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).

### SEC-03 — Raw authentication errors were shown to users

| Field | Detail |
| --- | --- |
| Severity/category | Low; CWE-204 (observable response discrepancy), defense-in-depth |
| Affected file | `src/components/AuthModal.tsx` |
| Input source | Supabase authentication response |
| Sensitive operation | Authentication failure reporting |
| Attack path | Repeated login/signup attempts could compare provider-specific messages |
| Impact | Possible account-existence or provider-detail disclosure |
| Exploitability | Depends on Supabase response behavior and project configuration, which were not tested with real accounts |
| Confidence | Medium |
| Correction | Replace raw provider messages with operation-specific generic messages |
| Implemented/test | Yes; build/lint and modal rendering verified |
| Remaining limitation | Supabase rate limits, CAPTCHA, email-enumeration protection, recovery, and verification configuration are outside this repository |

Defense-in-depth changes also reject non-HTTP(S) outbound URLs and delay third-party YouTube iframe creation until explicit user action. Production CSP, HSTS, frame protections, Permissions-Policy, and Referrer-Policy must be configured and tested at the actual host; no deployment configuration exists here. The [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) is the implementation reference.

## 10. Database and data-integrity findings

There is no database schema or migration set to audit. Supabase authentication alone does not demonstrate database ownership rules or Row Level Security. No claim can be made about authorization, indexes, foreign keys, retention, deletion, or transactional behavior.

Measured catalog facts:

- 1,799 records spanning 1935–2027; scores range from 7.2–9.9.
- IDs are unique.
- Two duplicate title/year pairs exist.
- 1,794 records use placeholder director values; 1,794 use placeholder cast values.
- Only 854 trailer IDs are unique; fallback `c7ynwAgQD-0` is reused 946 times.
- 18 duplicate provider entries exist and are now normalized at runtime.
- All parsed scores, match values, provider lists, and provider URL protocols passed the added integrity checks.
- Genre distribution is strongly synthetic: all 1,799 records include Thriller, 1,733 include Sci-Fi, and 1,711 include Horror.
- Static provider links/prices are not live, licensed availability evidence.

Local watchlist records are now shape-checked and alert preferences are deduplicated by user/movie/type, but browser storage is not an authoritative datastore and should never enforce ownership, roles, prices, or permissions.

## 11. Performance findings

| Metric | Baseline | Final | Interpretation |
| --- | ---: | ---: | --- |
| Main JS minified | 2,211.25 kB | 519.89 kB | 76.5% smaller initial application chunk |
| Main JS gzip | 526.88 kB | 147.74 kB | 72.0% smaller initial application chunk |
| Lazy catalog JS minified | Included in main | 1,713.47 kB | Loaded separately after shell initialization |
| Lazy catalog JS gzip | Included in main | 386.42 kB | Total JS remains approximately 534.16 kB gzip |
| CSS gzip | Not separately recorded | 10.57 kB | Informational only |

Additional improvements:

- Added catalog loading/error UI rather than blocking the entire application shell.
- Added intrinsic image dimensions, eager hero image hints, lazy card images, and decoding hints.
- Added `content-visibility` with an intrinsic size for off-screen movie rows.
- Cancelled superseded TMDB search requests.
- Cleaned toast timers to avoid overlapping cleanup work.

The Vite >500 kB warning remains for the catalog chunk and was not suppressed. No Lighthouse/WebPageTest run or field Core Web Vitals data was available, so no LCP, INP, CLS, or real network-time claim is made.

## 12. Code-quality findings

Improvements:

- Extracted catalog types/provider constants from the 2.4 MB data module so type/value consumers do not couple to the dataset.
- Added reusable dialog behavior and provider-contrast utilities.
- Centralized storage keys and validation.
- Added a dependency-free Node test harness using the installed TypeScript compiler.
- Added AbortSignal support to TMDB search.
- Replaced the generic Vite README with project setup, scripts, boundaries, and security guidance.
- Added provider normalization at a single application boundary.

Remaining maintainability risks:

- `App.tsx` still owns many responsibilities and is the most fragile component.
- The 1,799-record TypeScript literal is difficult to review, validate, and update.
- `HeroBanner.tsx`, `App.css`, template SVG assets, `public/icons.svg`, and `src/assets/hero.png` appear unused, but were not deleted because Git history and provenance were unavailable.
- No formatter, CI gate, component test framework, or E2E suite exists.
- Several policies and product statements are embedded directly in components.

## 13. SEO findings

Implemented:

- Replaced unsupported “best/newest/instant alerts” claims in the document metadata.
- Added accurate title, description, robots, Open Graph, Twitter card, and runtime canonical URL metadata.
- Added title-specific metadata for open movie links.
- Added semantic headings, main content, meaningful image alternative text, and `public/robots.txt`.

Remaining:

- This is a client-rendered SPA with no title routes or prerendered movie pages; search engines may index fewer titles than a server-rendered catalog.
- No production hostname is known, so a sitemap was not fabricated.
- No structured data was added because provider availability, credits, ratings provenance, canonical production URLs, and business ownership are not sufficiently verified.
- JavaScript-generated canonical URLs can be processed by Google, but static HTML or server rendering is more robust; see [Google’s JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## 14. Analytics and observability findings

No analytics, error tracking, structured logging, performance monitoring, CTA tracking, conversion tracking, admin audit log, request ID, or integration-failure monitoring exists.

No paid/external monitoring service was added without approval. Recommended events are privacy-minimized counts for search success/no-result, trailer opt-in, provider click, watchlist add/remove, share completion, and API failure—without search text, email, tokens, keys, or full URLs unless a reviewed privacy policy permits them.

## 15. Corrections implemented

The implementation selection stayed within five quick-win groups, three medium groups, and one larger group:

| Group | Evidence | Correction/impact | Risk, test, rollback |
| --- | --- | --- | --- |
| Quick: truthful product copy | Unsupported match, popularity, price, notification, and availability claims | Trustworthy score/availability/alert language | Low; browser/text inspection; revert component copy |
| Quick: environment hygiene | `.env` present but not ignored; template README | Ignore local env files, add example and guidance | Low; secret scan; revert docs/ignore entries |
| Quick: SEO baseline | Generic/unsupported metadata; no robots file | Accurate metadata, canonical URL, robots file | Low; build/browser head check; revert metadata |
| Quick: outbound-link safety | Helper accepted arbitrary protocols | HTTP(S) allow-list and unit test | Low; service test; revert validator |
| Quick: provider consistency | 18 duplicate entries and unreadable chips | Normalize IDs/metadata and calculate contrast | Low; catalog test/browser; revert boundary map |
| Medium: responsive navigation/UI | 320 px menu offscreen and cramped search | Responsive header, hero, filters, visible actions | Medium; six viewports and screenshots; revert component/CSS changes |
| Medium: accessible interaction model | Non-semantic footer and modal keyboard gaps | Shared focus trap, semantics, focus/target improvements | Medium; keyboard/browser checks; revert hook and modal wiring |
| Medium: resilient client state/search | stale requests, malformed storage, region bug | Abort, validation, storage sync, correct reset/filter state | Medium; test/browser checks; revert state effects independently |
| Larger: restorable movie experience | modal state could not be shared/refreshed | URL-synchronized movie deep links and lazy catalog shell | Medium; deep-link/back/close/build checks; revert URL and dynamic-import effects |

## 16. Features implemented

- Shareable and refresh-restorable movie URLs.
- Explicit, privacy-conscious trailer loading.
- Honest local alert-preference saving with validation and duplicate prevention.
- Cross-tab watchlist event handling and defensive storage parsing.
- More constrained semantic, typo-tolerant, and decade-aware search.
- Recoverable catalog loading state.
- Responsive mobile navigation with account actions.

## 17. Features recommended for later

The highest-priority later features are a provenance-controlled catalog import pipeline, licensed region-aware availability, real notification delivery, account-synchronized preferences with reviewed RLS, authentication recovery/verification UX, and a data-review/admin workflow. See `SOL_FEATURE_RECOMMENDATIONS.md` for 17 challenged and scored options.

## 18. Files changed

Added:

- `.env.example`
- `public/robots.txt`
- `scripts/run-tests.mjs`
- `src/data/catalog.ts`
- `src/hooks/useAccessibleDialog.ts`
- `src/lib/color.ts`
- `src/services/catalogClassification.ts`
- `SOL_COMPLETE_WEBSITE_AUDIT.md`
- `SOL_FEATURE_RECOMMENDATIONS.md`
- `SOL_IMPLEMENTATION_CHANGELOG.md`
- `SOL_MICROTAG_FILTER_AUDIT.md`

Modified:

- `.gitignore`, `README.md`, `index.html`, `package.json`
- `src/App.tsx`, `src/index.css`, `src/data/movies.ts`
- `src/services/affiliate.ts`, `src/services/smartSearch.ts`, `src/services/tmdbApi.ts`
- `src/components/AlertsModal.tsx`, `AuthModal.tsx`, `FilterBar.tsx`, `HeroBanner.tsx`, `HeroCarousel.tsx`, `LegalModal.tsx`, `MovieCard.tsx`, `MovieRow.tsx`, `Navbar.tsx`, `SettingsModal.tsx`, `ShareModal.tsx`, `TrailerModal.tsx`, `WatchlistModal.tsx`

Generated `dist/` output changed during verification but remains ignored. No dependency was added and `package-lock.json` was not intentionally changed. Existing unprefixed audit documents were left untouched for provenance but are superseded.

## 19. Database migrations

None. The repository contains no database schema/migration system, and no production database was accessed.

## 20. Tests added

`scripts/run-tests.mjs` now verifies:

- Affiliate parameter generation.
- Rejection of non-HTTP(S) provider URLs.
- Semantic search, combined decade/genre filtering, typo tolerance, and unrelated-query rejection.
- Parsing of all 1,799 catalog records.
- Unique IDs, score/match ranges, provider-list presence, and safe provider URL protocols.
- Reporting of duplicate provider entries that are normalized at runtime.

## 21. Final test results

| Test | Result |
| --- | --- |
| `npm run build` (includes TypeScript) | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass |
| `npm audit --json` | Pass; 0 vulnerabilities |
| High-confidence secret signature scan | Pass; 0 findings |
| Browser console | Pass; no final application warning/error |
| Responsive browser checks | Pass at 320, 375, 430, 768, 1440, and 1920 px |
| Search/filter/watchlist/legal/auth-modal/deep-link flows | Pass for locally testable states |
| Keyboard dialog Escape/focus loop/body lock | Pass |
| Trailer privacy gate | Pass; deep link created 0 iframes before explicit choice |
| Formatting | Not run; no formatter/script |
| Automated accessibility/CWV/E2E suite | Not available |
| Real auth email/signup/login/logout | Not run; would require real external delivery/account state |
| Live TMDB/provider availability | Not run; no approved production credential or licensed availability source |

Tests failed in the final state: 0. One intermediate TypeScript error caused by an overly narrow provider-map key type was found and corrected before the final clean run.

## 22. Configuration required

Copy `.env.example` to `.env` and configure as applicable:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TMDB_API_KEY` (optional)

All `VITE_*` values are delivered to the browser. Never use a Supabase service-role key or another private secret. Configure Supabase redirect URLs, email templates, password/recovery controls, abuse protections, and Row Level Security in the Supabase project before production use. Production hosting must also set HTTPS and reviewed security headers.

## 23. Remaining risks

1. Catalog metadata, genre/tags, credits, trailers, availability, and prices are not sufficiently trustworthy for definitive claims.
2. Client-only storage can be read or changed by the user, local software, extensions, or same-origin scripts.
3. Supabase RLS/authorization, recovery, verification, rate limits, and session configuration are unverified.
4. Production security headers, HTTPS behavior, caching, redirects, and CDN behavior are unverified.
5. The catalog chunk remains large and total JavaScript transfer is roughly unchanged.
6. No CI, formatter, formal accessibility automation, E2E suite, performance lab, monitoring, or analytics exists.
7. Legal/privacy/affiliate copy has not been reviewed by counsel; embedded claims should be verified before launch.
8. External media and provider links can change; trailer IDs and availability need recurring validation.
9. Signed-in users may expect cloud synchronization, but watchlists and alerts remain local.

## 24. Prioritized next steps

1. **P0:** Establish catalog provenance, validation rules, duplicate resolution, credit/trailer correction, and an auditable import format.
2. **P0:** Choose and contract for a region-aware availability source; remove any unsupported price/availability data.
3. **P1:** Define the Supabase schema and reviewed RLS for account-owned watchlists/preferences before cloud sync.
4. **P1:** Build a real notification service only after consent, abuse, deliverability, unsubscribe, retention, and legal decisions.
5. **P1:** Add password recovery/email verification UX and test Supabase security configuration.
6. **P1:** Add CI with install, build/type, lint, test, secret scanning, and a browser smoke test.
7. **P2:** Add axe-based accessibility tests, Lighthouse/WebPageTest budgets, and privacy-reviewed first-party observability.
8. **P2:** Move catalog data to a compressed validated artifact or paginated API; measure before choosing the architecture.
