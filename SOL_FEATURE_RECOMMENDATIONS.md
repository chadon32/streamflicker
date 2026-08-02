# StreamFlicker Feature Recommendations

These recommendations follow the measured repository and runtime evidence in `SOL_COMPLETE_WEBSITE_AUDIT.md`. Scores use 1 (low) to 10 (high); for difficulty, risk, and maintenance, a higher score is worse. “Later” means the feature should not be built until its listed dependency or business decision is resolved.

## Product value and priority

| ID | Priority | Feature and detailed description | Problem solved / intended user | User and business value / exact fit | Expected impact | Status and reasoning |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | P0 | **Catalog provenance and validation pipeline.** Replace manual TypeScript records with a versioned import format, source attribution, schema validation, duplicate reports, and review gates. | Placeholder, synthetic, duplicate, and unverifiable metadata harms every viewer. | Users receive trustworthy discovery data; the business reduces reputational and correction cost. This directly addresses the repository’s largest measured risk. | Very high trust, search quality, and maintainability improvement. | **Later.** Data sources/licensing and editorial ownership must be decided first. |
| F2 | P0 | **Licensed region-aware availability.** Query a selected provider for current country-specific subscription/rental availability and freshness timestamps. | Static links and prices cannot prove that a title is available. | Viewers can make a real “where to watch” decision; outbound clicks become more qualified and commercially credible. | Very high conversion and trust impact. | **Later.** Requires a licensed source, commercial terms, server-side credentials, caching policy, and attribution rules. |
| F3 | P1 | **Real saved-alert delivery.** Convert local preferences into consented, verified, deduplicated notification jobs with unsubscribe and failure handling. | Current alerts intentionally save preferences but send nothing. | Returning viewers can act when a title becomes available; the business gains retention. It completes an already-visible journey. | High retention impact if availability data is reliable. | **Later.** Requires F2, consent/legal decisions, abuse controls, deliverability, and background infrastructure. |
| F4 | P1 | **Account-synced watchlists and preferences.** Store user-owned lists/services with Supabase RLS, optimistic local UI, conflict handling, and import of current local data. | Signed-in users reasonably expect persistence across devices. | Users retain their collection; the business gains account value and return visits. | High retention, moderate conversion impact. | **Later.** Schema, RLS, retention, deletion, and conflict rules are not defined. |
| F5 | P1 | **Authentication recovery and verification UX.** Add forgot-password, reset callback, email-verification state, resend limits, and session-expiry recovery. | Authentication currently stops at sign-in/sign-up. | Reduces avoidable account loss and support friction. Fits the existing Supabase entry point. | High journey completion impact. | **Later.** Requires approved redirect URLs, templates, rate limits, and sandbox email testing. |
| F6 | P1 | **Search relevance and feedback loop.** Keep constrained concept/decade/typo matching, add explicit result ranking and privacy-safe no-result/success metrics. | Baseline fuzzy matching returned many unrelated high-score titles. | Viewers find titles faster; better queries increase trailer/provider engagement. Search is the application’s central utility. | High task-success impact. | **Partly now.** Matching was corrected and tested; ranking telemetry waits for a privacy decision. |
| F7 | P1 | **Shareable movie deep links.** Keep modal state in `?movie=`, restore on refresh/back/forward, and emit title-specific metadata. | Shared URLs previously lost the selected movie. | Recipients land on the intended title; the business gains attributable discovery traffic. | Medium-high acquisition impact at low cost. | **Implemented now.** Local, reversible, and fully testable without external services. |
| F8 | P1 | **Editorial import review console/report.** Show validation failures, duplicates, missing credits, repeated trailer IDs, suspect tags, and availability age before publishing. | Data errors are currently buried in a 2.4 MB source literal. | Editors correct problems before users see them; business reduces production defects. | High operational time savings and trust. | **Later.** Start as a generated local report after F1; do not build a full admin app prematurely. |
| F9 | P2 | **Sort and active-filter summary.** Add explicit sort by catalog score/year/title plus removable filter chips and result counts. | Results are always score-sorted and the active state is spread across several horizontal rows. | Power users understand and adjust results faster. | Medium usability impact. | **Later.** Small enhancement after data-score provenance is clarified. |
| F10 | P2 | **Watchlist import/export.** Export versioned JSON and import with schema validation, duplicate handling, preview, and confirmation. | Local-only storage is vulnerable to browser clearing and device changes. | Users can back up or migrate without requiring an account; lowers lock-in concerns. | Medium trust/time-saving impact. | **Later.** Safe without a backend, but the data format should follow F1/F4 identifiers. |
| F11 | P2 | **Service-preference onboarding and coverage view.** Ask users which services they have, explain local storage, and show how many filtered titles each covers. | “My Services” can return an unexplained empty result if no services are configured. | Faster first use and more relevant results; provider clicks become better targeted. | Medium-high conversion impact. | **Later.** Counts are useful only after availability quality improves; basic empty-state guidance can be a small interim change. |
| F12 | P2 | **Trailer integrity and accessibility checker.** Validate unique video IDs, title alignment, availability, privacy domain, caption metadata, and last-checked date. | 946 catalog records reuse one fallback trailer and captions are unknown. | Viewers receive the correct trailer and can make an informed caption choice. | High trust/accessibility impact. | **Later.** Requires provider API rules/quotas and an editorial correction workflow. |
| F13 | P2 | **Local-first recommendation profiles.** Derive explainable recommendations from watchlist/tags in the browser, with reset/export and no sensitive inference. | Curated rows repeat heavily and do not adapt. | Returning users discover relevant titles; business gains deeper sessions without a paid AI service. | Medium engagement and differentiation. | **Later.** Only after metadata quality improves; otherwise it amplifies bad tags. |
| F14 | P2 | **Privacy-preserving first-party observability.** Record aggregate search success/no-result, trailer opt-in, provider click, watchlist action, API failure, and Web Vitals with retention limits. | There is no evidence about funnel loss or runtime reliability. | Users benefit from evidence-led fixes; business can prioritize based on real friction. | High decision-quality impact. | **Later.** Requires analytics purpose, consent, retention, hosting, and privacy-policy decisions. |
| F15 | P3 | **Installable offline shell.** Cache only the application shell and a bounded recent catalog; include a documented service-worker kill switch and never cache auth-sensitive responses. | Repeat visits redownload the shell and fail entirely offline. | Some mobile users gain resilience; business may gain repeat use. | Low-medium impact for this content-heavy app. | **Later.** Measure repeat-mobile/offline demand first; service workers add meaningful maintenance/security risk. |
| F16 | P3 | **Movie-night voting links.** Create expiring, unguessable rooms where invited users vote on a small shortlist without exposing accounts. | Group selection happens outside the product. | Groups reach a decision and share StreamFlicker; potential differentiated acquisition loop. | Medium upside but uncertain demand. | **Later.** Validate demand before adding real-time state, abuse controls, retention, and moderation. |
| F17 | Reject | **Generative-AI chat concierge.** Natural-language conversational recommendations backed by a paid model API. | Could answer broad recommendation prompts. | Some novelty, but current search already covers the core need. | Uncertain; likely high cost relative to proven value. | **Reject.** Requires paid APIs, server secrets, prompt-safety/privacy work, evaluation, and ongoing cost before catalog trust is solved. |

## Delivery, privacy, security, and maintenance

| ID | Effort | Complexity | Technical risk | Dependencies | Privacy concerns | Security concerns | Maintenance burden | Primary success metric |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | 4–8 weeks | High | Medium | Licensed sources, schema, editorial owner | Source/licensing records | Import validation; supply-chain provenance | High | ≥99% records pass validation; placeholder credits <1% |
| F2 | 6–12 weeks | Very high | High | Availability vendor, backend, cache | Region/location minimization | Server secret, rate limits, cache isolation | Very high | Verified provider-click success; stale records below SLA |
| F3 | 6–10 weeks | High | High | F2, email/SMS vendor, jobs | Consent, retention, unsubscribe | Abuse, enumeration, injection, replay | High | Delivery rate and alert-to-provider-click conversion |
| F4 | 4–8 weeks | High | High | Supabase schema/RLS | Account-linked viewing intent | BOLA/RLS, deletion, conflict integrity | High | Cross-device retrieval success; sync conflict rate |
| F5 | 2–4 weeks | Medium | Medium | Supabase/email sandbox | Email and recovery events | Enumeration, redirect abuse, brute force | Medium | Recovery completion rate; support failures |
| F6 | 1–3 weeks remaining | Medium | Low-medium | Better catalog; privacy-approved metrics | Search text can reveal interests | Query/log injection; quota abuse for TMDB | Medium | Search-to-title-open rate; no-result rate |
| F7 | Completed | Low | Low | Stable movie IDs | Shared URL exposes chosen title | Parameter validation and canonicalization | Low | Shared-link open-to-trailer/provider rate |
| F8 | 3–6 weeks | Medium-high | Low-medium | F1 rules/source IDs | Editorial identities if tracked | Admin authorization if made web-accessible | Medium-high | Defects caught before publish; review time |
| F9 | 1–2 weeks | Low | Low | Trusted score/year fields | None material | URL/filter parameter validation | Low | Filter-to-title-open time; reset use |
| F10 | 1–2 weeks | Medium | Low-medium | Versioned schema | Export reveals viewing choices | Malformed/oversized import, CSV/JSON injection | Low | Successful restore rate; import rejection accuracy |
| F11 | 2–4 weeks | Medium | Low-medium | F2 coverage data | Service subscriptions are preference data | Storage tampering must not grant access | Medium | My Services activation and provider CTR |
| F12 | 3–6 weeks | Medium-high | Low-medium | Video API/editorial flow | External viewing request metadata | API key/quotas; unsafe IDs/URLs | Medium-high | Incorrect/fallback trailer rate |
| F13 | 4–8 weeks | High | Medium | Reliable tags and watchlist | Viewing preferences/inferences | Manipulated storage; avoid sensitive profiling | High | Recommendation open/save rate and dismiss rate |
| F14 | 3–6 weeks | Medium-high | Medium | Consent, retention, endpoint | Event minimization and lawful basis | PII/token leakage, endpoint abuse | High | Error detection time; funnel coverage; data loss rate |
| F15 | 3–5 weeks | Medium-high | Medium | HTTPS, cache plan | Avoid caching private/session data | Compromised/stale worker, cache poisoning | High | Repeat-load success under flaky network |
| F16 | 6–10 weeks | High | Medium-high | Backend, room lifecycle | Social graph and vote history | Enumeration, spam, moderation, ownership | High | Room completion/share rate |
| F17 | 8+ weeks | Very high | High | Paid model API/backend/evaluation | Prompts may contain sensitive interests | Prompt injection, abuse, secret/cost exposure | Very high | No build recommended; validate demand first |

## Scorecard

| ID | User value | Business value | Conversion impact | Time savings | Competitive advantage | Confidence | Difficulty | Technical risk | Maintenance cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| F1 | 9 | 10 | 7 | 8 | 8 | 10 | 7 | 5 | 7 |
| F2 | 10 | 10 | 9 | 9 | 9 | 8 | 9 | 8 | 9 |
| F3 | 9 | 9 | 8 | 7 | 7 | 8 | 8 | 8 | 8 |
| F4 | 8 | 8 | 6 | 7 | 5 | 8 | 7 | 7 | 7 |
| F5 | 8 | 7 | 7 | 6 | 3 | 9 | 5 | 6 | 5 |
| F6 | 9 | 8 | 7 | 8 | 6 | 9 | 5 | 4 | 5 |
| F7 | 8 | 7 | 6 | 5 | 4 | 10 | 3 | 2 | 2 |
| F8 | 8 | 9 | 7 | 9 | 7 | 10 | 6 | 4 | 6 |
| F9 | 7 | 6 | 5 | 7 | 3 | 8 | 3 | 2 | 3 |
| F10 | 6 | 4 | 2 | 7 | 4 | 7 | 4 | 4 | 3 |
| F11 | 8 | 8 | 8 | 7 | 6 | 8 | 5 | 4 | 5 |
| F12 | 7 | 6 | 5 | 8 | 5 | 8 | 6 | 4 | 6 |
| F13 | 8 | 7 | 6 | 6 | 7 | 6 | 7 | 6 | 7 |
| F14 | 5 | 9 | 6 | 8 | 3 | 8 | 6 | 6 | 7 |
| F15 | 5 | 4 | 3 | 4 | 3 | 6 | 6 | 5 | 7 |
| F16 | 7 | 6 | 5 | 5 | 7 | 5 | 7 | 6 | 7 |
| F17 | 3 | 3 | 2 | 2 | 4 | 7 | 8 | 8 | 9 |

## Recommended sequence

1. Prove data provenance and editorial ownership (F1/F8).
2. Select a licensed availability source and backend boundary (F2).
3. Complete authentication recovery and reviewed account ownership (F5/F4).
4. Add real alerts only after reliable availability and consent decisions (F3).
5. Measure search/provider journeys privately, then iterate on search, services, and sorting (F6/F14/F11/F9).
6. Consider personalization, offline support, or group voting only after evidence demonstrates demand (F13/F15/F16).

The rejected AI concierge should not be reconsidered until the catalog is trustworthy, user demand is measured, and a paid/server-side operating model is approved.
