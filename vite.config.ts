import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PRIVATE_QUERY_KEYS, SEO_PAGES } from './src/seo/pages.ts'

// Mirror only our documented page routes during local verification. Vercel
// owns production status codes/redirects via vercel.json; no SPA catch-all.
function publicPages(): Plugin {
  return {
    name: 'streamflicker-public-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname === '/business') {
          res.writeHead(308, { Location: `/about${url.search}` }); res.end(); return;
        }
        if (url.pathname !== '/' && url.pathname in SEO_PAGES) req.url = `/index.html${url.search}`;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname === '/business' || url.pathname === '/business/') {
          res.writeHead(308, { Location: `/about${url.search}` }); res.end(); return;
        }
        const normalized = url.pathname === '/index.html' ? '/' : url.pathname.replace(/(?:\.html|\/)$/, '');
        if (url.pathname !== '/' && normalized in SEO_PAGES && normalized !== url.pathname) {
          res.writeHead(308, { Location: `${normalized}${url.search}` }); res.end(); return;
        }
        if (PRIVATE_QUERY_KEYS.some((key) => url.searchParams.has(key))) res.setHeader('X-Robots-Tag', 'noindex, follow');
        if (url.pathname.startsWith('/api/')) res.setHeader('X-Robots-Tag', 'noindex');
        const isMissingPage = !url.pathname.includes('.') && !(url.pathname in SEO_PAGES) && !url.pathname.startsWith('/api/');
        if (isMissingPage || url.pathname === '/404.html') {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(readFileSync(resolve(server.config.root, server.config.build.outDir, '404.html')));
          return;
        }
        next();
      });
    },
  };
}

// The two Latin font files are used on every page, so ask for them in the HTML instead of
// waiting for the stylesheet to discover them. Later subsets load only when a page needs them.
function preloadFonts(): Plugin {
  return {
    name: 'streamflicker-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const fonts = Object.values(context.bundle ?? {}).filter((output) =>
          output.type === 'asset' && /(?:inter|outfit)-latin-wght-normal-[A-Za-z0-9_-]+[.]woff2$/.test(output.fileName));
        if (fonts.length !== 2) throw new Error('Expected the Inter and Outfit Latin font files in the production build');
        return fonts.map((font) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/${font.fileName}` },
          injectTo: 'head' as const,
        }));
      },
    },
  };
}

// The home page ships only the reviewed titles (src/data/homeCatalog.ts); the full
// catalog is a separate chunk that the app requests after first paint, so it is
// deliberately not preloaded here.
export default defineConfig({
  appType: 'mpa',
  define: {
    'import.meta.env.VITE_DEPLOY_NOINDEX': JSON.stringify(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' ? 'true' : 'false'),
  },
  plugins: [react(), tailwindcss(), preloadFonts(), publicPages()],
})
