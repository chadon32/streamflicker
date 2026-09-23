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
        if (url.pathname === '/about' || url.pathname === '/movie-night') req.url = `/index.html${url.search}`;
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

// The full catalog is needed immediately on first visit, but remains a separate
// cacheable chunk. Let the HTML parser fetch it alongside the app, rather than
// waiting for React's catalog-loading effect to discover the dynamic import.
function preloadCatalog(): Plugin {
  return {
    name: 'streamflicker-preload-catalog',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const catalog = Object.values(context.bundle ?? {}).find((output) =>
          output.type === 'chunk'
          && output.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/data/generatedMovies.ts'));
        if (!catalog) throw new Error('The browser catalog chunk is missing from the production build');
        return [{
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${catalog.fileName}` },
          injectTo: 'head',
        }];
      },
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  define: {
    'import.meta.env.VITE_DEPLOY_NOINDEX': JSON.stringify(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' ? 'true' : 'false'),
  },
  plugins: [react(), tailwindcss(), preloadCatalog(), publicPages()],
})
