// Live progress for slow work (Solana writes): the server streams one JSON object per line ({step}, then {done} or {error}),
// the client reads it as it arrives. Used by stamp claims and by publishing a declaration.

export type ProgressEvent = { step?: string; done?: unknown; error?: string; status?: number; [k: string]: unknown };

/** Server: a streaming response for `run`, which reports steps through `emit` and returns the result. */
export function progressResponse(run: (emit: (e: ProgressEvent) => void) => Promise<unknown>, fail: (e: unknown) => { status: number; body: Record<string, unknown> }): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ProgressEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try { emit({ done: await run(emit) }); }
      catch (e) { const f = fail(e); emit({ ...f.body, error: String(f.body.error ?? "Something went wrong."), status: f.status }); }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}

export const wantsProgress = (req: Request) => (req.headers.get("accept") ?? "").includes("application/x-ndjson");

/** Client: reads a progress stream, calling onStep for each step. Resolves to the result; throws with the server's message on error. */
export async function readProgress<T>(r: Response, onStep: (step: string, e: ProgressEvent) => void): Promise<T> {
  if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error || "Something went wrong. Please try again.");
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let result: T | undefined;
  for (;;) {
    const { value, done: end } = await reader.read();
    buf += dec.decode(value, { stream: !end });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines.filter(Boolean)) {
      const ev = JSON.parse(line) as ProgressEvent;
      if (ev.step) onStep(ev.step, ev);
      else if (ev.error) throw new Error(ev.error);
      else if (ev.done !== undefined) result = ev.done as T;
    }
    if (end) break;
  }
  if (result === undefined) throw new Error("The connection dropped before it finished.");
  return result;
}
