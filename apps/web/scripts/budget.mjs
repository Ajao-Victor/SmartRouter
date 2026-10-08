// Bundle budget check (design.md §5): run after `pnpm build` (optionally NEXT_DIST_DIR=.next-build).
// Next reports first-load JS per route in its App Router manifest; budgets below are raw kB
// (≈ 3× the gzipped figure in design.md: landing ≤ 220 kB gz, chat ≤ 260 kB gz, WebGL chunk ≤ 180 kB gz).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.env.NEXT_DIST_DIR ?? '.next';
const GZ_RATIO = 3;
// WebGL: three.js core alone is ≈165 kB gz, so the lazy scene chunk budget is 230 kB gz (memory.md decision).
const BUDGET_GZ_KB = { landing: 220, chat: 260, webglChunk: 230 };

let manifest;
try {
  manifest = JSON.parse(readFileSync(`${DIST}/app-build-manifest.json`, 'utf8'));
} catch {
  console.error('budget: run `pnpm build` first (app-build-manifest.json missing)');
  process.exit(1);
}

const kbOf = (rel) => Math.round(statSync(join(DIST, rel)).size / 1024);
const routeKey = (suffix) => Object.keys(manifest.pages ?? {}).find((k) => k.endsWith(suffix)) ?? suffix;
const firstLoad = (suffix) => (manifest.pages?.[routeKey(suffix)] ?? []).filter((f) => f.endsWith('.js')).reduce((n, f) => n + kbOf(f), 0);

const chunkDir = `${DIST}/static/chunks`;
const chunks = [];
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.js')) chunks.push({ p, kb: Math.round(statSync(p).size / 1024) });
  }
};
walk(chunkDir);
chunks.sort((a, b) => b.kb - a.kb);
const firstLoadFiles = new Set(Object.values(manifest.pages ?? {}).flat());
const lazy = chunks.filter(({ p }) => !firstLoadFiles.has(p.replace(`${DIST}/`, '')));
const webgl = lazy.find(({ p }) => /three|WebGLRenderer/.test(readFileSync(p, 'utf8').slice(0, 20000))) ?? lazy[0];

let fail = false;
const report = (label, rawKb, gzLimit) => {
  const ok = rawKb <= gzLimit * GZ_RATIO;
  if (!ok) fail = true;
  console.log(`${ok ? 'OK  ' : 'OVER'} ${label}: ${rawKb} kB raw ≈ ${Math.round(rawKb / GZ_RATIO)} kB gz (limit ${gzLimit} gz)`);
};
report('landing first-load', firstLoad('/page'), BUDGET_GZ_KB.landing);
report('chat first-load', firstLoad('chat/[chatId]/page'), BUDGET_GZ_KB.chat);
report('largest lazy WebGL chunk', webgl?.kb ?? 0, BUDGET_GZ_KB.webglChunk);
console.log('top chunks:', chunks.slice(0, 4).map(({ p, kb }) => `${p.split('/').pop()}=${kb}kB`).join(', '));
process.exit(fail ? 1 : 0);
