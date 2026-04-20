import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import type { TraceEntry } from '@processgraph/shared';

export function readTraceEntries(workspaceRoot: string, maxEntries = 500): TraceEntry[] {
  const traceFile = join(workspaceRoot, '.traces', 'current.jsonl');
  if (!existsSync(traceFile)) return [];

  try {
    const content = readFileSync(traceFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: TraceEntry[] = lines.slice(-maxEntries).map(l => JSON.parse(l));
    return entries;
  } catch {
    return [];
  }
}

export interface SessionInfo {
  name: string;
  ts: string;
  count: number;
}

export function listSessions(workspaceRoot: string): SessionInfo[] {
  const tracesDir = join(workspaceRoot, '.traces');
  if (!existsSync(tracesDir)) return [];

  try {
    const files = readdirSync(tracesDir)
      .filter(f => f.endsWith('.jsonl') && f !== 'current.jsonl' && f !== 'proxy.jsonl');

    return files.map(f => {
      const fullPath = join(tracesDir, f);
      const stats = statSync(fullPath);
      const content = readFileSync(fullPath, 'utf-8');
      const lineCount = content.trim().split('\n').filter(Boolean).length;
      return {
        name: basename(f, '.jsonl'),
        ts: stats.mtime.toISOString(),
        count: lineCount,
      };
    }).sort((a, b) => b.ts.localeCompare(a.ts));
  } catch {
    return [];
  }
}

export function readSessionEntries(workspaceRoot: string, fileName: string): TraceEntry[] {
  const traceFile = join(workspaceRoot, '.traces', `${fileName}.jsonl`);
  if (!existsSync(traceFile)) return [];

  try {
    const content = readFileSync(traceFile, 'utf-8');
    return content.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}
