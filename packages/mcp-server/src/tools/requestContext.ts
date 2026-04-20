import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import type { TraceWriter } from '../trace.js';

interface RequestContextResult {
  files: { path: string; content: string }[];
  total_bytes: number;
  truncated: boolean;
}

export async function requestContext(
  root: string,
  trace: TraceWriter,
  pattern: string
): Promise<RequestContextResult> {
  const matches = await glob(pattern, { cwd: root, nodir: true });
  const files: { path: string; content: string }[] = [];
  let totalBytes = 0;

  for (const m of matches) {
    const fullPath = join(root, m);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      totalBytes += Buffer.byteLength(content);
      files.push({ path: m, content });
    }
  }

  trace.append({
    ts: new Date().toISOString(),
    kind: 'request_context',
    glob: pattern,
    matched: matches,
    totalBytes,
  });

  return { files, total_bytes: totalBytes, truncated: false };
}
