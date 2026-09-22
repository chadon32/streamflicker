import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const outputDir = resolve('node_modules/.cache/streamflicker-seo');
await build({
  configFile: false,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEPLOY_NOINDEX': JSON.stringify(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' ? 'true' : 'false'),
  },
  build: {
    ssr: 'src/seo/render.tsx', outDir: outputDir, emptyOutDir: true,
    rolldownOptions: { output: { entryFileNames: 'render.mjs' } },
  },
});
const { renderPage, SEO_PAGES, SITE_ORIGIN } = await import(pathToFileURL(resolve(outputDir, 'render.mjs')));
const template = await readFile('dist/index.html', 'utf8');
// These tags are exclusively managed by PageSeo, including the development
// defaults. main.tsx removes these seeds before React 19 takes ownership.
const cleanTemplate = template
  .replace(/<(title|script)\b[^>]*data-rh="true"[^>]*>[\s\S]*?<\/\1>/g, '')
  .replace(/<(?:meta|link)\b[^>]*data-rh="true"[^>]*\/?>/g, '');
for (const path of [...Object.keys(SEO_PAGES), '/404']) {
  const { html, head } = renderPage(path);
  let page = cleanTemplate.replace('</head>', `${head}\n</head>`).replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  if (path !== '/') {
    // Informational pages have no interactive controls requiring React.
    page = page.replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');
  }
  await writeFile(`dist/${path === '/' ? 'index' : path.slice(1)}.html`, page);
}
const urls = Object.keys(SEO_PAGES).map((path) => `  <url><loc>${SITE_ORIGIN}${path}</loc></url>`).join('\n');
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log('Generated crawlable home, static About and movie-night guide, 404, and sitemap.');
