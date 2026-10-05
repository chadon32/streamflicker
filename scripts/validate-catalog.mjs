import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repositoryRoot, 'src/data/movies.ts');
const qualityPath = resolve(repositoryRoot, 'src/services/catalogQuality.ts');
const reportPath = resolve(repositoryRoot, 'docs/catalog-quality-report.json');
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check') || !shouldWrite;

async function importTypeScriptModule(path) {
  const source = await readFile(path, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

const sourceText = await readFile(sourcePath, 'utf8');
const catalogMatch = sourceText.match(
  /export const SAMPLE_MOVIES: Movie\[\] = (\[[\s\S]*?\]);\s*export const movies/,
);
assert.ok(catalogMatch, 'Could not parse src/data/movies.ts');
const sourceMovies = JSON.parse(catalogMatch[1]);
const {
  CATALOG_CHECKED_AT,
  CATALOG_FRESHNESS_DAYS,
  CATALOG_REGION,
  VALIDATED_CATALOG_ENTRIES,
  enrichValidatedMovie,
  validateCatalogRecord,
} = await importTypeScriptModule(qualityPath);

const sourceMoviesById = new Map();
for (const movie of sourceMovies) {
  assert.equal(sourceMoviesById.has(movie.id), false, `Duplicate local source key: ${movie.id}`);
  sourceMoviesById.set(movie.id, movie);
}

const sourceTrailerCounts = new Map();
const sourceProviderCounts = new Map();
const sourceIdCounts = new Map();
const localIdCounts = new Map();
for (const movie of sourceMovies) {
  const trailerId = typeof movie.youtubeTrailerId === 'string' ? movie.youtubeTrailerId.trim() : '';
  sourceTrailerCounts.set(trailerId, (sourceTrailerCounts.get(trailerId) ?? 0) + 1);
  localIdCounts.set(movie.id, (localIdCounts.get(movie.id) ?? 0) + 1);
  if (movie.sourceId) {
    sourceProviderCounts.set(movie.sourceId, (sourceProviderCounts.get(movie.sourceId) ?? 0) + 1);
    sourceIdCounts.set(movie.sourceId, (sourceIdCounts.get(movie.sourceId) ?? 0) + 1);
  }
}

const validated = [];
const validationReasonCounts = new Map();
for (const [movieId, entry] of Object.entries(VALIDATED_CATALOG_ENTRIES)) {
  const sourceMovie = sourceMoviesById.get(movieId);
  assert.ok(sourceMovie, `Validated entry ${movieId} is missing from src/data/movies.ts`);
  assert.equal(sourceProviderCounts.get(entry.sourceId) ?? 0, 1, `${movieId} must have a unique source identity`);
  const result = validateCatalogRecord(sourceMovie, entry, CATALOG_CHECKED_AT, {
    trailerCounts: sourceTrailerCounts,
    sourceIdCounts,
    localIdCounts,
  });
  assert.deepEqual(result, { valid: true, reasons: [] }, `${movieId} failed the catalog gate`);
  const enrichedMovie = enrichValidatedMovie(sourceMovie, entry);
  assert.deepEqual(
    validateCatalogRecord(enrichedMovie, entry, CATALOG_CHECKED_AT, {
      trailerCounts: sourceTrailerCounts,
      sourceIdCounts,
      localIdCounts,
    }),
    result,
    `${movieId} changed when the validated source row was enriched`,
  );
  validated.push({
    id: movieId,
    title: sourceMovie.title,
    year: sourceMovie.year,
    sourceId: entry.sourceId,
    releaseDate: entry.releaseDate,
    checkedAt: entry.checkedAt,
  });
}

for (const movie of sourceMovies) {
  const entry = VALIDATED_CATALOG_ENTRIES[movie.id];
  const reasons = entry
    ? validateCatalogRecord(movie, entry, CATALOG_CHECKED_AT, {
      trailerCounts: sourceTrailerCounts,
      sourceIdCounts,
      localIdCounts,
    }).reasons
    : ['outside-curated-subset'];
  for (const reason of reasons) validationReasonCounts.set(reason, (validationReasonCounts.get(reason) ?? 0) + 1);
}

const reasonCounts = {
  'outside-curated-subset': validationReasonCounts.get('outside-curated-subset') ?? 0,
  'placeholder-credit': sourceMovies.filter((movie) =>
    /\b(?:a[- ]list|hollywood|main|generic|unknown|placeholder|director|cast|runtime)\b/i.test(String(movie.director ?? '').trim())
    || !Array.isArray(movie.cast)
    || movie.cast.length === 0
    || movie.cast.some((cast) => /\b(?:a[- ]list|hollywood|main|generic|unknown|placeholder|director|cast|runtime)\b/i.test(String(cast).trim()))).length,
  'shared-trailer': [...sourceTrailerCounts.values()].filter((count) => count > 1)
    .reduce((total, count) => total + count, 0),
  'future-release-year': sourceMovies.filter((movie) => movie.year > Number(CATALOG_CHECKED_AT.slice(0, 4))
    || (typeof movie.releaseDate === 'string' && movie.releaseDate > CATALOG_CHECKED_AT)).length,
  'invalid-source-evidence': [...validationReasonCounts.entries()]
    .filter(([reason]) => !['outside-curated-subset', 'placeholder credit', 'missing or shared trailer', 'duplicate trailer ID', 'future release date', 'duplicate source ID', 'duplicate local source key'].includes(reason))
    .reduce((total, [, count]) => total + count, 0),
};

const report = {
  checkedAt: CATALOG_CHECKED_AT,
  region: CATALOG_REGION,
  freshnessDays: CATALOG_FRESHNESS_DAYS,
  source: 'src/data/movies.ts',
  recordCount: sourceMovies.length,
  validatedCount: validated.length,
  suppressedCount: sourceMovies.length - validated.length,
  searchOnlyPolicy: 'Records outside the validated subset remain discovery-searchable only and must show a provenance warning.',
  availabilityPolicy: 'Bundled records never expose guessed providers. Live provider data must include TMDB/JustWatch attribution, region, status, and checkedAt.',
  knownSuppressionSignals: reasonCounts,
  validated,
};
const serializedReport = `${JSON.stringify(report, null, 2)}\n`;

if (shouldWrite) {
  await writeFile(reportPath, serializedReport, 'utf8');
  console.log(`Wrote ${reportPath}`);
} else if (shouldCheck) {
  // Git on Windows (core.autocrlf) checks this file out with CRLF line endings; compare content, not line endings.
  const existingReport = (await readFile(reportPath, 'utf8').catch(() => '')).replace(/\r\n/g, '\n');
  assert.equal(existingReport, serializedReport, 'docs/catalog-quality-report.json is stale. Run node scripts/validate-catalog.mjs --write.');
  console.log(`Catalog gate passed: ${validated.length}/${sourceMovies.length} records are eligible for trusted surfaces.`);
}
