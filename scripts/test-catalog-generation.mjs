import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { renderFactsModule } from './lib/enrich.mjs';
import { importTypeScriptSource } from './lib/load-ts.mjs';

const temporaryRoot = await mkdtemp(join(tmpdir(), 'streamflicker-catalog-'));
const absentNativeApp = join(temporaryRoot, 'ios', 'App', 'App');
const generatorPath = resolve('scripts/generate-catalog.mjs');
const testEnvironment = { ...process.env, STREAMFLICKER_NATIVE_APP_DIR: absentNativeApp };

function run(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    env: testEnvironment,
    encoding: 'utf8',
  });
}

try {
  const result = run(process.execPath, [generatorPath, '--check']);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Native catalog artifact check skipped because ios\/App\/App is absent/);
  assert.equal(existsSync(absentNativeApp), false, 'A web-only check must not recreate the ignored native tree');

  // Facts read from TMDB are applied by the generator. Generate twice into temporary directories (the real
  // src/data is never touched): once with no facts as a baseline, once with three fixture facts.
  const generateInto = async (directory, facts) => {
    await mkdir(directory, { recursive: true });
    const factsPath = join(directory, 'tmdbFacts.ts');
    await writeFile(factsPath, renderFactsModule(facts, { maxAgeDays: 150 }));
    const generated = spawnSync(process.execPath, [generatorPath], {
      cwd: process.cwd(),
      env: { ...testEnvironment, STREAMFLICKER_TMDB_FACTS_PATH: factsPath, STREAMFLICKER_CATALOG_OUTPUT_DIR: directory },
      encoding: 'utf8',
    });
    assert.equal(generated.status, 0, `${generated.stdout}\n${generated.stderr}`);
    return {
      movies: (await importTypeScriptSource(await readFile(join(directory, 'generatedMovies.ts'), 'utf8'))).SAMPLE_MOVIES,
      home: await importTypeScriptSource(await readFile(join(directory, 'homeCatalog.ts'), 'utf8')),
    };
  };
  const baseline = await generateInto(join(temporaryRoot, 'baseline'), {});
  assert.equal(baseline.movies.filter((movie) => movie.recordSource === 'tmdb-checked').length, 0, 'With no facts no record is checked');
  const plain = baseline.movies.filter((movie) => !movie.recordSource);
  const withoutTrailer = plain.find((movie) => !movie.youtubeTrailerId);
  const withTrailer = plain.find((movie) => movie.youtubeTrailerId);
  const reviewed = baseline.movies.find((movie) => movie.recordSource === 'bundled-validated');
  assert.ok(withoutTrailer && withTrailer && reviewed, 'The fixture needs one title of each kind');
  const trailerKey = (letter) => letter.repeat(11);
  const identicalTrailer = plain.filter((movie) => movie.youtubeTrailerId && movie.id !== withTrailer.id)[0];
  assert.ok(identicalTrailer, 'The fixture needs a second title that already has a trailer');
  const applied = await generateInto(join(temporaryRoot, 'applied'), {
    [withoutTrailer.id]: [111, 'PG-13', 88, 5000, trailerKey('z'), 'poster', '2026-10-02'],
    [withTrailer.id]: [222, 'R', 130, 0, trailerKey('y'), 'title-year', '2026-10-02'],
    [identicalTrailer.id]: [444, 'PG', 95, 2500, identicalTrailer.youtubeTrailerId, 'poster', '2026-10-02'],
    [reviewed.id]: [333, 'G', 90, 1, trailerKey('x'), 'poster', '2026-10-02'],
  });
  const find = (movies, id) => movies.find((movie) => movie.id === id);
  const checked = find(applied.movies, withoutTrailer.id);
  assert.equal(checked.recordSource, 'tmdb-checked');
  assert.equal(checked.rating, 'PG-13');
  assert.equal(checked.duration, '1h 28m');
  assert.equal(checked.voteCount, 5000);
  assert.equal(checked.ratingSource, 'TMDB');
  assert.equal(checked.youtubeTrailerId, trailerKey('z'), "A title with no usable trailer gets TMDB's");
  assert.equal(checked.availability.checkedAt, undefined, 'A checked record does not claim reviewed availability');
  const kept = find(applied.movies, withTrailer.id);
  assert.equal(kept.youtubeTrailerId, withTrailer.youtubeTrailerId, 'A usable trailer is never replaced');
  assert.equal(kept.rating, 'R');
  assert.equal(kept.duration, '2h 10m');
  assert.equal('voteCount' in kept, false, 'A zero vote count is not stored');
  // Whether a trailer is TMDB's official one survives packing (bit 2 of the flags column).
  assert.equal(checked.trailerVerified, true, "A trailer filled from TMDB is marked verified");
  assert.equal('trailerVerified' in kept, false, "A bundled trailer that differs from TMDB's is not marked verified");
  assert.equal(find(applied.movies, identicalTrailer.id).trailerVerified, true, "A bundled trailer identical to TMDB's is marked verified");
  assert.equal(baseline.movies.filter((movie) => movie.trailerVerified).length, 0, 'With no facts no trailer is verified');
  assert.deepEqual(find(applied.movies, reviewed.id), reviewed, 'A reviewed title never receives fetched facts');
  const others = (movies) => movies.filter((movie) => movie.id !== withoutTrailer.id && movie.id !== withTrailer.id && movie.id !== identicalTrailer.id);
  assert.deepEqual(others(applied.movies), others(baseline.movies), 'No other record changes');
  // The 88-minute and the 95-minute fixtures are quick watches; the 130-minute one is not.
  assert.equal(applied.home.SHORTCUT_COUNTS.quickWatch, baseline.home.SHORTCUT_COUNTS.quickWatch + 2, 'Shortcut counts are recomputed with the facts');
  assert.equal(applied.home.BROWSABLE_RECORD_COUNT, baseline.home.BROWSABLE_RECORD_COUNT);
  assert.deepEqual(applied.home.HOME_MOVIES, baseline.home.HOME_MOVIES, 'The reviewed home catalog does not change');

  if (process.argv.includes('--build')) {
    const buildCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
    const buildArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'];
    const buildResult = run(buildCommand, buildArgs);
    assert.equal(buildResult.status, 0, `${buildResult.error ?? ''}\n${buildResult.stdout ?? ''}\n${buildResult.stderr ?? ''}`);
    assert.equal(existsSync(absentNativeApp), false, 'A web-only build must not recreate the ignored native tree');
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log('Passed catalog-generation check for an absent native tree.');
