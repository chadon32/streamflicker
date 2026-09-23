import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
