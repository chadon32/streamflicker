# StreamFlicker

## Search discovery and static pages

`npm run build` now also generates readable homepage HTML, script-free `/about`
and `/movie-night` pages, a real 404 document, and `sitemap.xml`. Metadata and
canonical page definitions live in `src/seo/pages.ts`. The homepage progressively
replaces its static shell with the existing React app; it is not fully hydrated SSR.

Run `npm run test:seo` after building to check generated metadata, schema,
internal links, sitemap entries, asset budgets, and local HTTP routing. Use
`npm run preview -- --host 127.0.0.1` to inspect the generated pages. Vercel
production routing is configured in `vercel.json`; do not add a catch-all rewrite.
Preview builds (`VERCEL_ENV=preview`) remain noindex after React mounts.

The guide links into `/?plan=1` and `/?q=zombie`. App search and movie-share
query URLs are functional, but excluded from indexing and the sitemap.
See [the September 2026 SEO audit](docs/seo-audit-2026-09-22.md) for evidence,
measurements, limitations, the keyword map, and the 30/60/90-day plan.

StreamFlicker is a client-side movie discovery interface built with React, TypeScript, Vite, and Tailwind CSS. It combines a bundled catalog with optional TMDB search, intent-aware discovery, family-friendly and date-night filters, local watchlists and service preferences, Supabase authentication, shareable movie links, and privacy-conscious trailer loading.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm ci
Copy-Item .env.example .env
npm run dev
```

Open the URL printed by Vite. The bundled catalog works without a TMDB key.

## Environment variables

Copy `.env.example` to `.env` and add:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for authentication.
- `TMDB_API_READ_ACCESS_TOKEN` (preferred) or `TMDB_API_KEY` enables the server-side `/api/tmdb-search` Vercel Function without exposing the credential to visitors. Live results load regional provider data, credits, certification, runtime, and an official trailer when TMDB supplies them. The endpoint expands strongly matching TMDB collections and exposes honest pagination for additional direct results.
- `VITE_TMDB_API_KEY` remains an optional browser-visible fallback for local development only. Do not put a private server token in a `VITE_*` variable.
- `VITE_TMDB_WATCH_REGION` sets the two-letter availability country and defaults to `US`.
- `VITE_TMDB_SEARCH_ORIGIN` sets the HTTPS host for `/api/tmdb-search` in Capacitor/native builds. Web builds use their current origin; the iOS fallback is `https://streamflicker.vercel.app`. This value is a public origin, never a TMDB credential.
- `VITE_AFFILIATE_AMAZON_TAG`, `VITE_AFFILIATE_APPLE_TOKEN`, `VITE_AFFILIATE_IMPACT_SUB_ID`, and `VITE_AFFILIATE_EBAY_CAMPAIGN_ID` for approved affiliate programs. These identifiers are public attribution values, not secrets; configure them in the deployment environment rather than exposing editable production settings.
- `VITE_AFFILIATE_CLICK_ENDPOINT` optionally enables a first-party `POST` for aggregate outbound-click reporting. It receives only provider ID, movie ID, event name, and timestamp; leave it blank to keep daily counts local to the browser.
- `VITE_NEWSLETTER_URL` optionally adds a website-only “Get weekly movie picks” link.
- `VITE_SUPPORT_URL` optionally adds a website-only “Support StreamFlicker” link. These links are intentionally hidden in the native iOS shell until the purchase and privacy flow has been reviewed for App Store requirements.

Optional accounts do not gate movie discovery. If a user creates an account, the app exposes **Account settings → Delete account**. The deletion action calls the `supabase/functions/delete-account` Edge Function, which validates the signed-in user's access token and deletes only that user's Supabase Auth record with the server-side service-role key. Configure the Edge Function's `SUPABASE_DELETE_ACCOUNT_ALLOWED_ORIGINS` as a comma-separated exact-origin allowlist; browser requests fail closed when it is missing or malformed, while configured Capacitor/Ionic origins and native bearer clients without an `Origin` header remain supported. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable or browser code.

Additional website revenue configuration:

- `VITE_SUPPORT_URL` may point to a Stripe Payment Link or another approved hosted supporter checkout. StreamFlicker never receives payment-card details.
- `VITE_SPONSOR_INQUIRY_URL` adds a sponsorship inquiry path. `VITE_SPONSOR_NAME`, `VITE_SPONSOR_HEADLINE`, and `VITE_SPONSOR_URL` enable one clearly labeled sponsor placement. Sponsor copy, CTA label, and image URL are optional.
- `VITE_ADSENSE_ENABLED`, `VITE_ADSENSE_CLIENT_ID`, `VITE_ADSENSE_HOME_SLOT`, and `VITE_ADSENSE_RESULTS_SLOT` enable two reserved Google AdSense placements. Keep advertising disabled until the domain is approved, `ads.txt` is installed for the assigned publisher ID, and the required consent management platform is configured.

Website monetization surfaces are hidden in the native iOS shell until their purchase, advertising, consent, and App Store policy flows have been reviewed. Invalid or incomplete URLs, sponsor settings, and AdSense identifiers fail closed and render nothing.

Deploy the function before enabling account creation in a production/App Store build:

```bash
supabase functions deploy delete-account
```

The function receives `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DELETE_ACCOUNT_ALLOWED_ORIGINS` from the Supabase Edge Function environment. Verify it with a disposable test account before submitting to App Review.

Every `VITE_*` value is embedded in browser-delivered JavaScript. Never put a service-role key, TMDB read-access token, private secret, or unrestricted credential in these variables. Supabase deployments must enforce Row Level Security independently; this repository does not contain the database schema or policies.

## Commands

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production bundle
npm run lint     # Run Oxlint
npm test         # Run service, search, and catalog integrity checks
npm run perf:benchmark # Benchmark 10 representative searches against the bundled catalog
npm run generate:catalog # Regenerate the packed, preclassified browser catalog
npm run preview  # Preview the built application
```

## iPhone app

StreamFlicker also includes a Capacitor iOS target that wraps the same production React app in a native iPhone shell. The web bundle is copied into `ios/App/App/public` during sync, so the two experiences stay aligned.

```bash
npm run ios:sync  # Build the web app and copy it into the iOS target
npm run ios:assets # Regenerate the branded iOS icon and launch assets
npm run ios:open  # Open the native project in Xcode (macOS only)
npm run ios:run   # Build and run on a configured simulator/device (macOS + Xcode)
```

On macOS, open the generated `ios/App/App.xcodeproj` in Xcode, choose a development team under Signing & Capabilities, then run on an iPhone simulator or connected device. Windows can prepare and sync the project but cannot run Apple's Xcode toolchain or sign an iOS build. Configure the desired `.env` values before `ios:sync`; `VITE_*` values are bundled into the app at build time. The release preflight refuses an EAS build when the Supabase client configuration is missing, so a TestFlight build cannot silently ship with broken account creation.

### EAS Cloud Build and TestFlight

StreamFlicker is also configured for the same EAS Cloud Build workflow used by CarPartsRadar. The Capacitor iOS project remains the source of truth; `ios:sync` mirrors its Xcode project into the EAS-compatible `ios/StreamFlicker.xcodeproj` shim, and EAS runs that sync hook before compiling and signing the native target on a macOS worker.

```bash
npx eas-cli@latest whoami
npm run eas:config
npm run eas:credentials:ios
npm run eas:build:ios
npm run eas:submit:ios
```

The production profile targets the StreamFlicker App Store Connect record (`6797452211`) and bundle identifier `com.streamflicker.app`. EAS credentials and Apple signing are managed interactively by EAS; never commit Apple certificates, API keys, or passwords. The EAS archive carries only the public client `.env` values needed by Vite; keep server-only credentials out of that file. A production build still requires an Apple Developer membership and a successful EAS build before it appears in TestFlight.

## Product and data boundaries

- The provider assignments embedded in the bundled catalog are legacy discovery metadata and are intentionally not rendered or counted as availability. Cards link to a title-and-year availability search instead of claiming a guessed service.
- Provider badges and provider filters appear only for live, regional TMDB watch-provider results marked as verified for the configured country. Provider data is supplied by JustWatch through TMDB and can still change after it is checked.
- The 1,799 bundled titles are an offline discovery fallback, not a complete or continuously refreshed movie database. Comprehensive current title search requires the deployed server-side TMDB integration; StreamFlicker fails closed rather than inventing missing titles or provider listings.
- Live text search expands only strongly matching TMDB collections (for example, the Harry Potter collection), deduplicates parts by TMDB ID, and exposes additional direct-result pages. Results remain bounded for reliability, so the interface never claims that one response contains every movie worldwide.
- TMDB developer access has separate commercial-use requirements. Because StreamFlicker includes monetization, confirm the applicable TMDB terms before enabling the integration in production.
- Alert preferences are saved in the browser only. No notification or email is sent because this repository has no notification backend.
- Watchlists and service preferences are stored in `localStorage`. Watchlists use separate guest and authenticated-user namespaces, and signing out or switching accounts reloads the active namespace before closing account-sensitive UI. An older global watchlist is retained in a separate migration key with unknown ownership; it is never assigned automatically and can be explicitly imported into the current guest or account namespace.
- Trailer embeds are not loaded until the user explicitly chooses to load YouTube.
- Search understands common viewing intents such as family, date night, and quick watch, then ranks or filters results with conservative catalog evidence.
- Search suggestions use the same active filters as the results grid, so selecting a suggestion cannot bypass family, date-night, quick-watch, genre, or provider constraints.
- Movie cards expose rating, runtime, audience context, and high-level content warnings before a user opens the detail view.
- The iPhone build exposes the native iOS share sheet through Capacitor Share while retaining copy-link and web share fallbacks.
- Watchlists can be copied as a portable shortlist. They remain browser-local until a future account-sync backend is added.
- Family-friendly mode is a discovery aid, not a parental-control guarantee. It now rejects additional risky title and synopsis signals such as vampire, thriller, cult, and serial-killer language; users should still confirm the provider rating and content notes.
- Much of the bundled catalog contains placeholder credits and repeated trailer metadata. Known shared trailer placeholders are suppressed and replaced by a title-specific YouTube search. See `SOL_COMPLETE_WEBSITE_AUDIT.md` for the measured data-quality findings.

## Audit artifacts

- `SOL_COMPLETE_WEBSITE_AUDIT.md`
- `SOL_FEATURE_RECOMMENDATIONS.md`
- `SOL_IMPLEMENTATION_CHANGELOG.md`
- `SOL_MICROTAG_FILTER_AUDIT.md`
