import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Load TypeScript source that has only type imports by transpiling it in memory (the project's test loader). */
export function importTypeScriptSource(source) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

export async function importTypeScriptModule(relativePath) {
  return importTypeScriptSource(await readFile(resolve(repositoryRoot, relativePath), 'utf8'));
}
