import { readFileSync, existsSync } from 'fs';
import type { TraceEntry } from '@processgraph/shared';

export function replay(traceFile: string): void {
  if (!existsSync(traceFile)) {
    console.error(`Trace file not found: ${traceFile}`);
    process.exit(1);
  }

  const content = readFileSync(traceFile, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const entries: TraceEntry[] = lines.map(l => JSON.parse(l));

  if (entries.length === 0) {
    console.log('Empty trace file');
    return;
  }

  console.log(`Trace: ${traceFile}`);
  console.log(`Entries: ${entries.length}`);
  console.log('---');

  // Track node transitions for dwell time
  let lastNodeTime: Date | null = null;
  let lastNode: string | null = null;

  for (const entry of entries) {
    const ts = new Date(entry.ts);
    const time = ts.toLocaleTimeString();

    switch (entry.kind) {
      case 'set_active_node': {
        if (lastNode && lastNodeTime) {
          const dwell = (ts.getTime() - lastNodeTime.getTime()) / 1000;
          console.log(`  [dwell: ${formatDuration(dwell)}]`);
        }
        console.log(`${time}  -> ${entry.node}${entry.previous ? ` (from ${entry.previous})` : ''}`);
        lastNode = entry.node;
        lastNodeTime = ts;
        break;
      }
      case 'complete_node':
        if (lastNode && lastNodeTime) {
          const dwell = (ts.getTime() - lastNodeTime.getTime()) / 1000;
          console.log(`  [dwell: ${formatDuration(dwell)}]`);
        }
        console.log(`${time}  [done] ${entry.node}: ${entry.summary}`);
        console.log(`         next: ${entry.next_options.map(o => o.id).join(', ') || '(none)'}`);
        lastNode = null;
        lastNodeTime = null;
        break;
      case 'flag_blocked':
        console.log(`${time}  [BLOCKED] ${entry.reason}`);
        break;
      case 'request_context':
        console.log(`${time}  [context] ${entry.glob} -> ${entry.matched.length} files (${entry.totalBytes} bytes)`);
        break;
      case 'log_observation':
        console.log(`${time}  [note] ${entry.text}`);
        break;
      case 'tool_call':
        console.log(`${time}  [tool] ${entry.tool}${entry.paths?.length ? ` (${entry.paths.join(', ')})` : ''}`);
        break;
      case 'proxy_decision':
        console.log(`${time}  [proxy] ${entry.tool} ${entry.allowed ? 'ALLOWED' : 'DENIED'}${entry.reason ? `: ${entry.reason}` : ''}`);
        break;
    }
  }

  if (lastNode && lastNodeTime) {
    const last = new Date(entries[entries.length - 1].ts);
    const dwell = (last.getTime() - lastNodeTime.getTime()) / 1000;
    console.log(`  [dwell: ${formatDuration(dwell)}]`);
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}
