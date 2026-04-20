import type { StateManager } from '../state.js';
import type { TraceWriter } from '../trace.js';

export function setActiveNode(
  state: StateManager,
  trace: TraceWriter,
  nodePath: string
): { ok: boolean; previous: string | null } {
  const previous = state.setActiveNode(nodePath);
  trace.append({
    ts: new Date().toISOString(),
    kind: 'set_active_node',
    node: nodePath,
    previous,
  });
  return { ok: true, previous };
}
