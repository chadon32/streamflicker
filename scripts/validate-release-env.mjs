import { readFile } from 'node:fs/promises';

function parseDotEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

let localValues = {};
try {
  localValues = parseDotEnv(await readFile('.env', 'utf8'));
} catch {
  // EAS builds normally receive these values from the EAS environment. A
  // local .env is only a convenience for preparing the native project.
}

const forbiddenLocalKeys = Object.keys(localValues).filter((key) =>
  /^(TMDB_API|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET|VERCEL_)/i.test(key),
);
if (forbiddenLocalKeys.length > 0) {
  console.error('Refusing to archive server-only credentials from .env. Move them to the server deployment environment before building.');
  process.exit(1);
}

const getValue = (key) => (process.env[key] || localValues[key] || '').trim();
const supabaseUrl = getValue('VITE_SUPABASE_URL');
const supabaseAnonKey = getValue('VITE_SUPABASE_ANON_KEY');

const validUrl = /^https:\/\/[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/.*)?$/i.test(supabaseUrl)
  && !supabaseUrl.includes('placeholder');
const validAnonKey = supabaseAnonKey.length >= 100 && !supabaseAnonKey.includes('placeholder');

if (!validUrl || !validAnonKey) {
  console.error('Release configuration is incomplete: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set for the iOS build.');
  console.error('Set them in the EAS production environment or provide a local .env before running the native sync.');
  process.exit(1);
}

console.log('Release configuration preflight passed (Supabase client configuration is present).');
