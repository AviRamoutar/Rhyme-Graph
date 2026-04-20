import { appendFileSync, statSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';

const MAX_SIZE = 5 * 1024 * 1024;

export class AuditLogger {
  private tracesDir: string;
  private logFile: string;

  constructor(root: string) {
    this.tracesDir = join(root, '.traces');
    this.logFile = join(this.tracesDir, 'proxy.jsonl');
    mkdirSync(this.tracesDir, { recursive: true });
  }

  log(entry: {
    tool: string;
    allowed: boolean;
    activeNode: string | null;
    reason?: string;
  }): void {
    this.rotateIfNeeded();
    const record = {
      ts: new Date().toISOString(),
      kind: 'proxy_decision' as const,
      ...entry,
    };
    appendFileSync(this.logFile, JSON.stringify(record) + '\n');
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.logFile)) return;
    try {
      const stats = statSync(this.logFile);
      if (stats.size >= MAX_SIZE) {
        const archiveDir = join(this.tracesDir, 'archive');
        mkdirSync(archiveDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        renameSync(this.logFile, join(archiveDir, `proxy-${timestamp}.jsonl`));
      }
    } catch {
      // ignore
    }
  }
}
