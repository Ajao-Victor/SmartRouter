/** Encode SSE frames and build a timed event stream for the mock `/run`. */

export interface SseEvent {
  event: string;
  data: unknown;
  /** Delay before this event in ms. */
  delay?: number;
}

export function frame(ev: SseEvent): string {
  return `event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`;
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
