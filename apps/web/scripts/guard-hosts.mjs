// Fails the build if any MPP provider host leaks into the frontend.
// security.md §4: the browser never talks to providers; only the API and Tempo.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [/mpp\.tempo\.xyz/i, /paywithlocus\.com/i, /stablestudio\.dev/i];
const ROOTS = ['app', 'components', 'lib', 'stores', 'hooks'];
const EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.glsl']);

const hits = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (![...EXT].some((e) => name.endsWith(e))) continue;
    const text = readFileSync(full, 'utf8');
    for (const re of FORBIDDEN) {
      if (re.test(text)) hits.push(`${full}: matches ${re}`);
    }
  }
}

for (const root of ROOTS) walk(root);

if (hits.length > 0) {
  console.error('guard:hosts FAILED — provider hosts found in the frontend:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('guard:hosts OK — no provider hosts in app/components/lib/stores/hooks');
