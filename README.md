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
- `VITE_AFFILIATE_AMAZON_TAG`, `VITE_AFFILIATE_APPLE_TOKEN`, `VITE_AFFILIATE_IMPACT_SUB_ID`, and `VITE_AFFILIATE_EBAY_CAMPAIGN_ID` for approved affiliate programs. These identifiers are public attribution values, not secrets; configure them in the deployment environment rather than exposing editable production settings.
- `VITE_AFFILIATE_CLICK_ENDPOINT` optionally enables a first-party `POST` for aggregate outbound-click reporting. It receives only provider ID, movie ID, event name, and timestamp; leave it blank to keep daily counts local to the browser.
- `VITE_NEWSLETTER_URL` optionally adds a website-only “Get weekly movie picks” link.
- `VITE_SUPPORT_URL` optionally adds a website-only “Support StreamFlicker” link. These links are intentionally hidden in the native iOS shell until the purchase and privacy flow has been reviewed for App Store requirements.

Optional accounts do not gate movie discovery. If a user creates an account, the app exposes **Account settings → Delete account**. The deletion action calls the `supabase/functions/delete-account` Edge Function, which validates the signed-in user's access token and deletes only that user's Supabase Auth record with the server-side service-role key. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable or browser code.

Deploy the function before enabling account creation in a production/App Store build:

```bash
supabase functions deploy delete-account
```

The function receives `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase Edge Function environment. Verify it with a disposable test account before submitting to App Review.

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

### EAS Cloud Build and TestFlight

StreamFlicker is also configured for the same EAS Cloud Build workflow used by CarPartsRadar. The Capacitor iOS project remains the source of truth; `ios:sync` mirrors its Xcode project into the EAS-compatible `ios/StreamFlicker.xcodeproj` shim, and EAS runs that sync hook before compiling and signing the native target on a macOS worker.

```bash
npx eas-cli@latest whoami
npm run eas:config
npm run eas:credentials:ios
npm run eas:build:ios
npm run eas:submit:ios
```

The production profile targets the StreamFlicker App Store Connect record (`6797452211`) and bundle identifier `com.streamflicker.app`. EAS credentials and Apple signing are managed interactively by EAS; never commit Apple certificates, API keys, or passwords. A production build still requires an Apple Developer membership and a successful EAS build before it appears in TestFlight.

## Product and data boundaries

- Streaming links and prices in the bundled catalog are discovery links, not live inventory. Users should verify availability and price with the provider.
- Alert preferences are saved in the browser only. No notification or email is sent because this repository has no notification backend.
- Watchlists and service preferences are stored in `localStorage`; they are not synchronized to the signed-in account. Account deletion removes the Supabase account record; device-only watchlist and preference data is not associated with that account.
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
