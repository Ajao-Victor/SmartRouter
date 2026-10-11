/** Encode SSE frames and build a timed event stream for the mock `/run`. */

export interface SseEvent {
  /** `heartbeat` is written as a comment line (`: keep-alive`), like the live API. */
  event: string;
  /** Payload, or a thunk evaluated when the frame is written (lets `done` record side effects late). */
  data: unknown;
  /** Delay before this event in ms. */
  delay?: number;
}

export function frame(ev: SseEvent): string {
  if (ev.event === 'heartbeat') return ': keep-alive\n\n';
  const data = typeof ev.data === 'function' ? (ev.data as () => unknown)() : ev.data;
  return `event: ${ev.event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function sseStream(events: SseEvent[], speed = 1): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const ev of events) {
        const d = (ev.delay ?? 0) / speed;
        if (d > 0) await new Promise((r) => setTimeout(r, d));
        controller.enqueue(enc.encode(frame(ev)));
      }
      controller.close();
    },
  });
}

/** Split text into token-ish chunks. */
export function tokenize(text: string, size = 3): string[] {
  const words = text.split(/(\s+)/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(''));
  return out.filter((t) => t.length > 0);
}
