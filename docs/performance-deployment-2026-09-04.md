# Performance and production deployment — September 4, 2026

## Outcome

Deployed the current website improvements and measured search optimizations to [StreamFlicker](https://www.streamflicker.com/). Production promotion completed successfully, and the public website serves the new build.

- Deployment: `dpl_9Xiwr7ejb7X92ytuCfRgLUhAMvhb`
- Build URL: `https://streamflicker-6c62ikfv1-chadon32s-projects.vercel.app`
- Confirmed live aliases: `streamflicker.com`, `www.streamflicker.com`, `streamflicker.vercel.app`.
- Previous production deployment retained for rollback: `dpl_GvhJQdWSmQRa4vFkhqFZPRZygwRU` (`https://streamflicker-qf2ps104z-chadon32s-projects.vercel.app`).
- No Git commit or push, native iOS build, account migration, or payment changes were performed in this pass.

Browser checks used isolated in-app browser tabs only. No desktop helper, native computer control, user Chrome tabs, or game clients were used.

## Reproducible benchmark

Run `npm run perf:benchmark` from the repository root. Measurements used Node 24.15.0, 1,799 movie records, three warm-up batches, and 30 measured batches. Each batch performs these ten searches: `harry potter`, `spiderman`, `zombie`, `family movie`, `date night`, `sci fi`, `thriller`, `mission impossible`, `1990s horror`, and `romance`.

| Stage | Mean per 10-search batch | Median | P95 |
| --- | ---: | ---: | ---: |
| Before this pass | 273.466 ms | 276.675 ms | 283.742 ms |
| Relevance-score caching alone | 273.972 ms | 278.219 ms | 285.564 ms |
| Final, run 1 | 43.205 ms | 43.475 ms | 46.650 ms |
| Final, run 2 | 45.300 ms | 45.352 ms | 48.280 ms |

The average of the two final means is 44.253 ms: **83.8% less elapsed CPU benchmark time**, or approximately 6.2 times the throughput. This is a warm local search benchmark, not a network, cold-start, rendering, LCP, or whole-page-load measurement. Searches with no results are included. The benchmark does not establish catalog completeness.

Catalog expansion averaged 0.438 ms before and 0.451–0.487 ms after. It was not the significant CPU bottleneck.

## What changed and why

1. A CPU profile identified full edit-distance computation as the dominant search hotspot. Search only asks whether two words differ by at most one edit. A linear, allocation-free two-pointer predicate now answers that exact question, preserving insertion, deletion, and substitution semantics.
2. Adjacent-word matching stops building candidate strings once they cannot match the target length.
3. Search relevance is calculated once per result instead of repeatedly inside the sort comparator. This alone did not produce a measurable benchmark gain; profiling guided the subsequent optimization.
4. Homepage recommendations and the featured selection depend on the canonical catalog, avoiding their recalculation when search results change while those homepage sections are hidden.
5. Built HTML now preloads the separate, content-hashed movie catalog module. The browser can discover it while parsing HTML instead of waiting for the React loading effect. A production-build check fails if the catalog chunk cannot be found.
6. Added an early connection hint for the existing TMDB image host. Network/LCP gains from the loading hints were not separately measured.
7. Added a deployment allowlist. Only 62 website build-input files, about 3.78 MB, are uploaded; local environment files, signing credentials, native projects, screenshots, and video-production workspaces are excluded. Future build-input directories must be explicitly allowed.

The catalog remains approximately 752.80 kB uncompressed / 341.41 kB gzip. This pass improves search work and resource discovery; it does not claim a substantial JavaScript payload reduction.

## Validation actually performed

- `npm test`: passed service, search, planner, and 1,799-record catalog checks.
- New threshold predicate compared against a full dynamic-programming reference across all 16,129 pairs of binary strings of lengths zero through six, plus realistic typo cases.
- Exact result ordering regressions passed for mixed franchise and non-franchise results.
- A separate comparison of the prior and optimized algorithms matched result IDs and ordering for 13 queries across the bundled catalog.
- `npm run lint`: passed.
- `npm run build`: TypeScript and Vite production build passed locally; the Vercel remote production build also passed.
- Scoped `git diff --check`: passed for the changed tracked implementation files. Existing unrelated working-tree changes were preserved.
- Production build JavaScript and the catalog asset returned successfully. The client build does not contain Vercel's `[SENSITIVE]` environment placeholder.
- Live HTML loads `index-BtTJ7QqZ.js` and preloads `generatedMovies-aJguSZZ9.js`, matching the staged build that was promoted.
- Live desktop: homepage, Browse All (30 of 1,799), and Zombie movies (30 of 76) rendered correctly.
- Live 390 × 844 viewport: homepage, planner opening, runtime filtering, and closing worked. All three tested short-runtime picks displayed 100 minutes or less.
- After closing the planner, keyboard Page Down moved the document to 738 px. Document content width equaled its 384 px layout viewport; no horizontal page overflow was observed.
- Live search error handling honestly reported unavailable expanded search. This integration check is a known limitation, not a passing catalog-completeness test.

## Deployment safeguards

The remote build used the existing production environment without replacing values. Some production settings are protected by Vercel and appear as `[SENSITIVE]` when downloaded, so a local prebuilt deployment using that downloaded file was deliberately avoided.

The deployment was built with `--prod --skip-domain`, inspected, then promoted with the Vercel CLI. Authenticated `vercel curl` automatically generated a project deployment-protection bypass token during staged validation; its value was not displayed or placed in source files. Deployment protection was not disabled. Public domain checks took place after promotion.

## Remaining issues and limits

- **Expanded live movie search is not configured in production.** A public request for `harry potter` returned HTTP 503 with `configured: false` and `Live catalog search is not configured.` The server expects `TMDB_API_READ_ACCESS_TOKEN` or `TMDB_API_KEY`; neither was present in the production environment listing. Supply a valid server-side TMDB credential and redeploy to enable this integration. Do not expose a server credential through a `VITE_` variable.
- The bundled catalog currently returns zero Harry Potter results and only one result for `spiderman`. Faster matching cannot supply records absent from the bundled catalog. Provider and franchise completeness remain unverified.
- Existing catalog metadata quality concerns (ratings, durations, scores, future titles) remain. This deployment is not a metadata accuracy certification.
- The build still warns about the large catalog chunk. Tests report 18 legacy duplicate provider entries normalized by the existing pipeline.
- No live account, payment, subscription, email, or native-app operations were tested. No App Store/TestFlight build was submitted.
- No full browser performance audit, cold-load benchmark, screen-reader audit, or simulated slow-network test was performed. The numerical speed claim is limited to the reproducible CPU benchmark above.
