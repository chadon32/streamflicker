import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

async function importTypeScriptModule(relativePath) {
  const source = await readFile(resolve(relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const nativeSource = await readFile(resolve('ios/App/App/NativeMovieNightPlugin.swift'), 'utf8');
const nativeCatalog = await readFile(resolve('ios/App/App/NativeValidatedCatalog.swift'), 'utf8');
const catalogSource = await readFile(resolve('src/data/movies.ts'), 'utf8');
const catalogMatch = catalogSource.match(/export const SAMPLE_MOVIES: Movie\[] = (\[[\s\S]*?\]);\s*export const movies/);
assert.ok(catalogMatch, 'The source catalog should remain parseable');
const sourceMovies = JSON.parse(catalogMatch[1]);
const { getValidatedCatalog } = await importTypeScriptModule('src/services/catalogQuality.ts');
const { buildMovieNightShareText, getShareEligibility } = await importTypeScriptModule('src/services/shareText.ts');
const validated = getValidatedCatalog(sourceMovies);

assert.ok(validated.length > 0 && validated.length <= 17, 'Native should receive only the repository validated subset');
for (const movie of validated) {
  assert.match(nativeCatalog, new RegExp(`id: "${movie.id.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"`), `${movie.id} must be in the generated native subset`);
}
assert.equal((nativeCatalog.match(/\n      id: /g) ?? []).length, validated.length, 'Native artifact should contain exactly the validated subset');
assert.match(nativeSource, /NativeValidatedCatalog\.records/, 'Native planner must consume the generated validated artifact');
assert.match(nativeSource, /\.prefix\(3\)/, 'Native planner must return at most three picks');
assert.match(nativeSource, /No validated titles match/, 'Native planner must show an honest no-match state');
assert.doesNotMatch(nativeSource, /filtered\.isEmpty \? catalog/, 'Native planner must not fall back to its whole catalog');
assert.doesNotMatch(nativeSource, /String\(format:.*score|★/, 'Native planner must not display unsupported star scores');
assert.doesNotMatch(nativeSource, /"\(recommendations\.count\)|"\(filterDescription\)/, 'Native labels must use real interpolation');
assert.match(nativeSource, /sourceLabel|availabilityStatus|region|checkedAt/, 'Native share metadata must carry provenance and freshness');
const nativeShareMethod = nativeSource.match(/@objc private func sharePlan\(\)[\s\S]*?private func restoreSavedPlan/)?.[0] ?? '';
assert.ok(nativeShareMethod, 'Native share method should remain present');

const scream = sourceMovies.find(({ id }) => id === 'scream-7-2026');
const paranormal = sourceMovies.find(({ id }) => id === 'paranormal-activity-8-2027');
const curatedSource = sourceMovies.find(({ id }) => id === validated[0]?.id);
assert.ok(curatedSource, 'A validated source fixture should exist for provenance regression checks');
assert.equal(getValidatedCatalog([{ ...curatedSource, recordSource: 'watchlist-fallback' }]).length, 0, 'Watchlist fallback cannot escalate into native trusted data');
assert.equal(getValidatedCatalog([{ ...curatedSource, recordSource: 'saved-watchlist' }]).length, 0, 'Saved Watchlist cannot escalate into native trusted data');
assert.equal(getShareEligibility(scream).shareable, false, 'Scream 7 must remain search-only');
assert.equal(getShareEligibility(paranormal).shareable, false, 'Paranormal Activity 8 must remain search-only');
assert.equal(getShareEligibility({ ...validated[0], recordSource: 'watchlist-fallback' }).shareable, false, 'Watchlist fallback must remain non-shareable');
assert.equal(getShareEligibility({ ...validated[0], recordSource: 'saved-watchlist' }).shareable, false, 'Saved Watchlist must remain non-shareable');
assert.match(
  buildMovieNightShareText('Curated for any occasion.', [validated[0]]),
  /reviewed list \(checked Sep 23, 2026\)\. Check availability before you pay\./,
  'Shared plans must still carry provenance and freshness, in plain language',
);
assert.doesNotMatch(nativeShareMethod, /\b(?:posterUrl|backdropUrl|user(?:Id|Name)|account(?:Id|Email))\b/i);

console.log(`Passed native validated-catalog and share-gating checks for ${validated.length} records.`);
