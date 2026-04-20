import type { TraceWriter } from '../trace.js';

export function logObservation(
  trace: TraceWriter,
  text: string
): { ok: boolean } {
  trace.append({
    ts: new Date().toISOString(),
    kind: 'log_observation',
    text,
  });
  return { ok: true };
}
