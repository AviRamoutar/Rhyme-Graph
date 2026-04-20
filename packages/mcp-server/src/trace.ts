import { appendFileSync, statSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import type { TraceEntry } from '@processgraph/shared';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export class TraceWriter {
  private tracesDir: string;
  private currentFile: string;

  constructor(private root: string) {
    this.tracesDir = join(root, '.traces');
    this.currentFile = join(this.tracesDir, 'current.jsonl');
    mkdirSync(this.tracesDir, { recursive: true });
  }

  append(entry: TraceEntry): void {
    this.rotateIfNeeded();
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(this.currentFile, line);
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.currentFile)) return;
    try {
      const stats = statSync(this.currentFile);
      if (stats.size >= MAX_SIZE) {
        const archiveDir = join(this.tracesDir, 'archive');
        mkdirSync(archiveDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = join(archiveDir, `trace-${timestamp}.jsonl`);
        renameSync(this.currentFile, archivePath);
      }
    } catch {
      // ignore stat errors
    }
  }

  getPath(): string {
    return this.currentFile;
  }
}
