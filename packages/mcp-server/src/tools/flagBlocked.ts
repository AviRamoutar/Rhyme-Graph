import type { TraceWriter } from '../trace.js';

export function flagBlocked(
  trace: TraceWriter,
  reason: string,
  suggestedInfo?: string
): { ok: boolean } {
  trace.append({
    ts: new Date().toISOString(),
    kind: 'flag_blocked',
    reason,
    suggested_info: suggestedInfo,
  });
  return { ok: true };
}
