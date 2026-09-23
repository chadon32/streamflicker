import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { preview } from 'vite';

const origin = 'https://streamflicker.com';
const socialImageUrl = `${origin}/streamflicker-social-preview.png`;
const routes = ['/', '/about', '/movie-night'];
const documents = new Map();
const titles = new Set();
const descriptions = new Set();
const results = [];
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const expectedRobots = process.env.SEO_EXPECT_NOINDEX === 'true' ? 'noindex,follow' : 'index,follow';
assert.equal(config.cleanUrls, true);
assert.equal(config.trailingSlash, false);
assert.equal(config.rewrites, undefined, 'Do not mask missing pages with a homepage catch-all');
assert.deepEqual(config.redirects, [{ source: '/business', destination: '/about', permanent: true }]);

for (const route of routes) {
  const html = await readFile(`dist/${route === '/' ? 'index' : route.slice(1)}.html`, 'utf8');
  documents.set(route, html);
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head, `${route}: head missing`);
  const tags = [...head.matchAll(/<(title|meta|link|script)\b[^>]*>/g)].map(([tag]) => tag);
  const single = (pattern) => {
    const matches = tags.filter((tag) => pattern.test(tag));
    assert.equal(matches.length, 1, `${route}: expected exactly one ${pattern}`);
    return matches[0];
  };
  single(/^<title\b/);
  descriptions.add(single(/name="description"/).match(/content="([^"]*)"/)[1]);
  assert.ok(single(/name="robots"/).includes(`content="${expectedRobots}"`));
  assert.ok(single(/rel="canonical"/).includes(`href="${origin}${route}"`));
  for (const property of ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:image', 'og:image:secure_url', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt']) single(new RegExp(`property="${property}"`));
  for (const name of ['twitter:title', 'twitter:description', 'twitter:card', 'twitter:image', 'twitter:image:alt']) single(new RegExp(`name="${name}"`));
  assert.equal(single(/property="og:image"/).match(/content="([^"]*)"/)[1], socialImageUrl);
  assert.equal(single(/name="twitter:image"/).match(/content="([^"]*)"/)[1], socialImageUrl);
  single(/type="application\/ld\+json"/);
  const schema = JSON.parse(head.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@context'], 'https://schema.org');
  assert.ok(schema['@graph'].some((entity) => entity['@id'] === `${origin}${route}#webpage`));
  assert.ok(schema['@graph'].some((entity) => entity['image'] === socialImageUrl || entity['image']?.url === socialImageUrl));
  assert.ok(!/AggregateRating|Review|Offer|FAQPage|SearchAction/.test(JSON.stringify(schema)), 'Do not invent rich-result markup');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${route}: one initial H1`);
  assert.doesNotMatch(html, /<div id="root"><\/div>/);
  if (route !== '/about') assert.match(html, /href="\/about"/);
  if (route !== '/movie-night') assert.match(html, /href="\/movie-night"/);
  titles.add(head.match(/<title[^>]*>([^<]*)<\/title>/)[1]);
  const jsAssets = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\/assets\/[^" ]+\.js)"/g)].map((match) => match[1]);
  let referencedJsBytes = 0;
  for (const asset of new Set(jsAssets)) referencedJsBytes += (await stat(`dist${asset}`)).size;
  if (route !== '/') {
    assert.equal(referencedJsBytes, 0, `${route}: informational pages must not load the app/catalog`);
    assert.doesNotMatch(html, /rel="modulepreload"|type="module"/);
  }
  results.push({ route, htmlBytes: Buffer.byteLength(html), initialH1s: 1, referencedJsBytes });
}
assert.equal(titles.size, routes.length);
assert.equal(descriptions.size, routes.length);
assert.match(documents.get('/movie-night'), /href="\/\?plan=1"/);
assert.match(documents.get('/movie-night'), /href="\/\?q=zombie"/);
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]), routes.map((route) => origin + route));
assert.doesNotMatch(sitemap, /<lastmod>|<loc>[^<]*\?|localhost|vercel\.app/);
assert.match(await readFile('dist/robots.txt', 'utf8'), /Sitemap: https:\/\/streamflicker\.com\/sitemap\.xml/);
assert.match(await readFile('dist/404.html', 'utf8'), /content="noindex,follow"/);
const socialImage = await readFile('dist/streamflicker-social-preview.png');
assert.equal(socialImage.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'social preview must be a PNG');
assert.equal(socialImage.readUInt32BE(16), 1200, 'social preview width');
assert.equal(socialImage.readUInt32BE(20), 630, 'social preview height');
assert.ok(socialImage.length > 10_000, 'social preview must contain real image data');

for (const key of ['q', 'movie', 'plan']) {
  assert.ok(config.headers.some((entry) => entry.source === '/:path*' && entry.has?.some((condition) => condition.type === 'query' && condition.key === key) && entry.headers.some((header) => header.key === 'X-Robots-Tag' && header.value.includes('noindex'))));
}

// These checks exercise the actual built pages and local routing mirror, not
// Google's index or Vercel's edge. Verify the latter again on an approved deploy.
const server = await preview({ preview: { host: '127.0.0.1', port: 4183, strictPort: true, open: false } });
try {
  const base = 'http://127.0.0.1:4183';
  for (const route of [...routes, '/sitemap.xml', '/robots.txt']) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 200, `${route} status`);
  }
  for (const [source, target] of [['/business', '/about'], ['/about/', '/about'], ['/about.html', '/about'], ['/index.html', '/']]) {
    const response = await fetch(base + source, { redirect: 'manual' });
    assert.equal(response.status, 308, `${source} redirect status`);
    assert.equal(response.headers.get('location'), target);
  }
  for (const route of ['/missing-seo-test', '/privacy', '/404.html']) assert.equal((await fetch(base + route)).status, 404, `${route} must not become a soft 404`);
  for (const route of ['/?q=zombie', '/?movie=unknown-title', '/?plan=1', '/about?q=zombie', '/movie-night?plan=1']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow');
  }
  assert.equal((await fetch(base + '/?utm_source=test')).headers.get('x-robots-tag'), null);
  console.log(JSON.stringify({ status: 'passed', scope: 'built HTML + local routing mirror', pages: results }, null, 2));
} finally {
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
