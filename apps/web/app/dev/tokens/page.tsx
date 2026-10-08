import { notFound } from 'next/navigation';

/**
 * Dev-only token gallery (Task 3 acceptance): swatches, type scale, glows, glass, effects.
 * Returns 404 in production builds.
 */
const COLORS = [
  'bg-0',
  'bg-1',
  'bg-2',
  'bg-3',
  'accent',
  'accent-hi',
  'accent-2',
  'accent-2-hi',
  'signal',
  'warn',
  'free',
  'quality',
  'price',
  'speed',
] as const;

const GLOWS = [
  ['shadow-glow-accent', 'accent'],
  ['shadow-glow-teal', 'teal / money'],
  ['shadow-glow-free', 'free'],
  ['shadow-glow-signal', 'signal'],
  ['shadow-glow-warn', 'warn'],
  ['shadow-dock', 'dock'],
] as const;

const SWATCH_CLASS: Record<(typeof COLORS)[number], string> = {
  'bg-0': 'bg-bg-0',
  'bg-1': 'bg-bg-1',
  'bg-2': 'bg-bg-2',
  'bg-3': 'bg-bg-3',
  accent: 'bg-accent',
  'accent-hi': 'bg-accent-hi',
  'accent-2': 'bg-accent-2',
  'accent-2-hi': 'bg-accent-2-hi',
  signal: 'bg-signal',
  warn: 'bg-warn',
  free: 'bg-free',
  quality: 'bg-quality',
  price: 'bg-price',
  speed: 'bg-speed',
};

export default function TokensPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-12">
      <header className="space-y-2">
        <p className="num text-2xs tracking-label text-text-2 uppercase">dev · design tokens</p>
        <h1 className="font-display text-display-sm text-text-0">
          The <span className="text-beam">Router</span> system
        </h1>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">Colour</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
          {COLORS.map((c) => (
            <div key={c} className="space-y-1">
              <div className={`h-14 rounded-md shadow-hairline ${SWATCH_CLASS[c]}`} />
              <p className="num text-2xs text-text-2">{c}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">Type scale</h2>
        <p className="font-display text-display-lg text-text-0">Display LG</p>
        <p className="font-display text-display text-text-0">Display</p>
        <p className="font-display text-display-sm text-text-0">Display SM</p>
        <p className="text-2xl text-text-0">2xl — Inter body scale</p>
        <p className="text-base text-text-1">base — secondary text</p>
        <p className="num text-3xl text-price">$0.0008</p>
        <p className="num text-sm text-text-2">mono · tabular · 1/34 of the price</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">Glow + hairline (no drop shadows)</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {GLOWS.map(([cls, label]) => (
            <div key={cls} className={`rounded-lg bg-bg-1 p-5 ${cls}`}>
              <p className="num text-xs text-text-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">Surfaces &amp; effects</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass rounded-lg p-5">
            <p className="text-sm text-text-0">glass</p>
            <p className="text-xs text-text-2">backdrop blur + hairline</p>
          </div>
          <div className="conic-border rounded-lg bg-bg-1 p-5">
            <span className="conic-border-ring" />
            <span className="conic-border-mask" />
            <p className="text-sm text-text-0">conic-border</p>
            <p className="text-xs text-text-2">rotating beam ring</p>
          </div>
          <div className="dashed-card rounded-lg p-5">
            <p className="text-sm text-text-0">dashed-card</p>
            <p className="text-xs text-text-2">coming soon · breathing</p>
          </div>
          <div className="rounded-lg bg-bg-1 p-5 shadow-hairline">
            <p className="glitch-text font-display text-lg text-text-0" data-text="Free · Llama 3.1 8B">
              Free · Llama 3.1 8B
            </p>
            <p className="text-xs text-text-2">glitch-text (CSS fallback)</p>
          </div>
          <div className="rounded-lg bg-bg-1 p-5 shadow-hairline">
            <p className="caret-stream text-sm text-text-0">Streaming reply</p>
            <p className="text-xs text-text-2">caret-stream</p>
          </div>
          <div className="scanline-once rounded-lg bg-bg-2 p-5">
            <p className="num text-sm text-text-0">const price = quote.price;</p>
            <p className="text-xs text-text-2">scanline-once</p>
          </div>
          <div className="bg-stripes-warn rounded-lg p-5">
            <p className="text-sm text-text-0">bg-stripes-warn</p>
            <p className="text-xs text-text-2">testnet banner</p>
          </div>
          <div className="bg-beam rounded-pill px-5 py-3 text-center text-sm font-medium text-text-inverse">
            bg-beam (primary button)
          </div>
          <div className="bg-slider-track h-3 self-center rounded-pill" />
        </div>
      </section>
    </main>
  );
}
