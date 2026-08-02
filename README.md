# StreamFlicker

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
- `VITE_TMDB_API_KEY` to enable optional TMDB search.

Every `VITE_*` value is embedded in browser-delivered JavaScript. Never put a service-role key, private secret, or unrestricted credential in these variables. Supabase deployments must enforce Row Level Security independently; this repository does not contain the database schema or policies.

## Commands

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production bundle
npm run lint     # Run Oxlint
npm test         # Run service, search, and catalog integrity checks
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

On macOS, open the generated `ios/App/App.xcodeproj` in Xcode, choose a development team under Signing & Capabilities, then run on an iPhone simulator or connected device. Windows can prepare and sync the project but cannot run Apple's Xcode toolchain or sign an iOS build. Configure the desired `.env` values before `ios:sync`; `VITE_*` values are bundled into the app at build time.

## Product and data boundaries

- Streaming links and prices in the bundled catalog are discovery links, not live inventory. Users should verify availability and price with the provider.
- Alert preferences are saved in the browser only. No notification or email is sent because this repository has no notification backend.
- Watchlists and service preferences are stored in `localStorage`; they are not synchronized to the signed-in account.
- Trailer embeds are not loaded until the user explicitly chooses to load YouTube.
- Search understands common viewing intents such as family, date night, and quick watch, then ranks or filters results with conservative catalog evidence.
- Search suggestions use the same active filters as the results grid, so selecting a suggestion cannot bypass family, date-night, quick-watch, genre, or provider constraints.
- Movie cards expose rating, runtime, audience context, and high-level content warnings before a user opens the detail view.
- The iPhone build exposes the native iOS share sheet through Capacitor Share while retaining copy-link and web share fallbacks.
- Watchlists can be copied as a portable shortlist. They remain browser-local until a future account-sync backend is added.
- Family-friendly mode is a discovery aid, not a parental-control guarantee. It now rejects additional risky title and synopsis signals such as vampire, thriller, cult, and serial-killer language; users should still confirm the provider rating and content notes.
- Much of the bundled catalog contains placeholder credits and repeated trailer metadata. See `SOL_COMPLETE_WEBSITE_AUDIT.md` for the measured data-quality findings.

## Audit artifacts

- `SOL_COMPLETE_WEBSITE_AUDIT.md`
- `SOL_FEATURE_RECOMMENDATIONS.md`
- `SOL_IMPLEMENTATION_CHANGELOG.md`
- `SOL_MICROTAG_FILTER_AUDIT.md`
