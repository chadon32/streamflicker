import type { ReactNode } from 'react';
import { TMDB_NOTICE } from '../services/attribution';
import { SiteFooter, SiteHeader } from './SiteChrome';
import { getContactEmail } from '../services/contact';
import { getMeasurementStatement } from '../services/privacyCopy';

const LAST_UPDATED = 'October 1, 2026';

const linkClass = 'text-rose-300 underline underline-offset-4 hover:text-rose-200';

/**
 * Static, route-friendly shell for the legal pages. Like About and the movie-night
 * guide it holds no client state, so it renders at build time with no JavaScript.
 */
function LegalPageShell({ heading, intro, children }: { heading: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#070709] text-zinc-100 selection:bg-rose-600 selection:text-white">
      <a
        href="#legal-content"
        className="fixed left-4 top-3 z-[110] -translate-y-20 rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="legal-content" className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-black leading-tight tracking-[-0.03em] text-white sm:text-5xl">{heading}</h1>
        <div className="mt-5 text-base leading-relaxed text-zinc-300">{intro}</div>
        <div className="mt-12 space-y-10">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold tracking-tight text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

function ContactLink({ children = 'contact us' }: { children?: ReactNode }) {
  const email = getContactEmail();
  return <a className={linkClass} href={email ? `mailto:${email}` : '/contact'}>{children}</a>;
}

export function PrivacyPage() {
  const clickEndpoint = (import.meta.env as Record<string, string | undefined>).VITE_AFFILIATE_CLICK_ENDPOINT;
  return (
    <LegalPageShell
      heading="Privacy policy"
      intro={
        <>
          <p>
            StreamFlicker helps you choose a movie. You don&apos;t need an account to search, watch a trailer, save a watchlist, or plan a movie night, and most of what the site remembers stays on your own device.
          </p>
          <p className="mt-3 text-sm text-ink-2">Last updated {LAST_UPDATED}.</p>
        </>
      }
    >
      <Section title="What stays on your device">
        <p>Your browser stores your watchlist, your saved movie nights, the streaming services you choose in My streaming services, and a random guest ID that keeps a guest watchlist separate from an account&apos;s. If you saved a reminder before we removed that feature, it is still stored there too. None of this is sent to us.</p>
        <p>The words you search for appear in the page address while you search, so you can reload or share the results.</p>
        <p>You can remove all of it at any time by clearing this site&apos;s data in your browser.</p>
      </Section>

      <Section title="What we send to other services">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Search.</strong> When you search, the words you type and your region go to our server, which asks The Movie Database (TMDB) for matching titles, trailers, ratings, and where-to-watch information and returns the answer to you. We don&apos;t save your searches in a database or link them to an account. The words travel in the request address, so like any request they can appear in our host&apos;s server logs (see Hosting and security).</li>
          <li><strong className="text-white">Posters and backdrops</strong> load straight from TMDB&apos;s image servers, so TMDB can see your IP address and browser details.</li>
          <li><strong className="text-white">Trailers.</strong> A trailer loads from YouTube only after you press &ldquo;Load trailer from YouTube.&rdquo; From then on YouTube (Google) receives your IP address and may set cookies under its own policy. We use YouTube&apos;s privacy-enhanced embed, which asks YouTube not to store information about visitors until they play a video.</li>
          <li><strong className="text-white">Fonts</strong> are served from StreamFlicker itself, so loading the page doesn&apos;t contact a font provider.</li>
          <li><strong className="text-white">Where to watch</strong> opens JustWatch or another site in a new tab. Those sites have their own privacy policies. Some links carry an affiliate tag that tells the retailer StreamFlicker sent you; the tag does not identify you.</li>
          <li><strong className="text-white">Ads.</strong> StreamFlicker may show Google AdSense ads. If ads are on, Google and its partners may use cookies or similar technology to show and measure them, and where the law requires it we ask for your consent first.</li>
        </ul>
        <p>{getMeasurementStatement(clickEndpoint)}</p>
      </Section>

      <Section title="Accounts (optional)">
        <p>If you sign in, our authentication provider (Supabase) keeps your email address and a securely hashed password, and your browser keeps a session token. We use them only to sign you in. Accounts don&apos;t sync your watchlist yet. To delete your account and its data, sign in and choose Account settings, then Delete account.</p>
      </Section>

      <Section title="Hosting and security">
        <p>StreamFlicker is hosted on Vercel, which records standard server logs (such as IP address, browser type, time, and the page requested) to run and protect the service. Connections use HTTPS.</p>
      </Section>

      <Section title="Children">
        <p>StreamFlicker isn&apos;t directed at children under 13 and doesn&apos;t knowingly collect their personal information. The PG-13-and-under filter is a convenience, not parental control.</p>
      </Section>

      <Section title="Your choices and rights">
        <p>Clear this site&apos;s data to remove everything stored on your device, and delete your account in Account settings. To ask what we hold about you, to have it corrected or deleted, or to ask any privacy question, <ContactLink />. Depending on where you live you may have additional rights, and we will honor them.</p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes, we will update the date at the top of this page.</p>
      </Section>
    </LegalPageShell>
  );
}

export function TermsPage() {
  const sellsViaAmazon = Boolean((import.meta.env as Record<string, string | undefined>).VITE_AFFILIATE_AMAZON_TAG);
  return (
    <LegalPageShell
      heading="Terms of use"
      intro={
        <>
          <p>By using StreamFlicker you agree to these terms. They are short on purpose.</p>
          <p className="mt-3 text-sm text-ink-2">Last updated {LAST_UPDATED}.</p>
        </>
      }
    >
      <Section title="What StreamFlicker is">
        <p>StreamFlicker is a movie discovery tool. It doesn&apos;t host, upload, or stream movies. Trailers are embedded from YouTube, and &ldquo;Where to watch&rdquo; sends you to other sites to check availability.</p>
      </Section>

      <Section title="Using the site">
        <p>Use StreamFlicker for your own, non-commercial movie planning. Please don&apos;t scrape it, overload it, or use it to build a competing database. We may change or stop any part of the site at any time.</p>
      </Section>

      <Section title="Information can be wrong">
        <p>Titles, ratings, runtimes, trailers, and availability come from our reviewed list and from third parties, and can be incomplete or out of date. The PG-13-and-under filter is not parental control: always check the rating and content notes for the people watching. Confirm availability and price before you subscribe or pay.</p>
      </Section>

      <Section title="Data credits">
        <p>{TMDB_NOTICE}</p>
        <p>Streaming availability data is provided by JustWatch through TMDB. Movie titles, posters, and other artwork belong to their respective studios and rights holders.</p>
      </Section>

      <Section title="Affiliate links, sponsors, and ads">
        <p>StreamFlicker may earn a commission when you use certain links to retailers or streaming services, at no extra cost to you.{sellsViaAmazon ? ' As an Amazon Associate, StreamFlicker earns from qualifying purchases.' : ''}</p>
        <p>Paid sponsor placements are labeled Sponsored. Sponsorship doesn&apos;t change the order of search results, filters, or editorial rows.</p>
        <p>StreamFlicker may also show ads or link to an external supporter checkout. Ad and payment providers operate under their own terms and privacy policies, and StreamFlicker never receives your payment card details.</p>
      </Section>

      <Section title="Copyright and takedown requests">
        <p>StreamFlicker doesn&apos;t host copyrighted media. Trailers are embedded from YouTube and artwork comes from TMDB. If you believe something on StreamFlicker infringes your copyright, <ContactLink>send a notice</ContactLink> that includes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>your name and contact details;</li>
          <li>a description of the work you own and the address (URL) on StreamFlicker where it appears;</li>
          <li>a statement that you believe in good faith the use isn&apos;t authorized by the owner, its agent, or the law;</li>
          <li>a statement, under penalty of perjury, that the notice is accurate and that you are the owner or authorized to act for them; and</li>
          <li>your physical or electronic signature.</li>
        </ul>
      </Section>

      <Section title="Accounts">
        <p>Accounts are optional. You can delete yours at any time in Account settings. We may remove an account that is used to abuse the site.</p>
      </Section>

      <Section title="No warranty">
        <p>StreamFlicker is provided &ldquo;as is,&rdquo; without warranties of any kind. To the extent the law allows, we aren&apos;t liable for any loss that comes from using the site or relying on its information.</p>
      </Section>

      <Section title="Changes">
        <p>We may update these terms. If we do, we will change the date at the top of this page, and using the site after that means you accept the update.</p>
      </Section>
    </LegalPageShell>
  );
}

export function ContactPage() {
  const email = getContactEmail();
  return (
    <LegalPageShell
      heading="Contact"
      intro={
        email ? (
          <p>
            Email <a className={linkClass} href={`mailto:${email}`}>{email}</a> about support, privacy requests, partnerships, or a copyright notice.
          </p>
        ) : (
          <p>
            Our public contact address is not set up yet, so we can&apos;t take messages or formal notices here right now. This page will show an email address as soon as one is published.
          </p>
        )
      }
    >
      <Section title="What to include">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Something isn&apos;t working.</strong> Tell us what you did, what you expected, and your browser or device.</li>
          <li><strong className="text-white">A privacy request.</strong> Say whether you want to see, correct, or delete your data, and the email address on your account if you have one. See the <a className={linkClass} href="/privacy">privacy policy</a>.</li>
          <li><strong className="text-white">A copyright concern.</strong> Follow the steps in the <a className={linkClass} href="/terms">terms of use</a>.</li>
          <li><strong className="text-white">A partnership or sponsorship.</strong> Sponsored placements are always labeled as sponsored.</li>
        </ul>
      </Section>
    </LegalPageShell>
  );
}
