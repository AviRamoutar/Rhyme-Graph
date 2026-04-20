import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { postMessage } from '../vscode';

type FilterKind = 'all' | 'state' | 'context' | 'blocks' | 'proxy';

const kindToFilter: Record<FilterKind, string[]> = {
  all: [],
  state: ['set_active_node', 'complete_node'],
  context: ['request_context', 'tool_call'],
  blocks: ['flag_blocked'],
  proxy: ['proxy_decision'],
};

const kindBadgeColors: Record<string, string> = {
  set_active_node: 'bg-accent',
  complete_node: 'bg-green-700',
  request_context: 'bg-blue-700',
  flag_blocked: 'bg-danger',
  log_observation: 'bg-node-border',
  tool_call: 'bg-blue-600',
  proxy_decision: 'bg-warn',
};

function formatEntry(entry: any): string {
  switch (entry.kind) {
    case 'set_active_node':
      return `Active: ${entry.node}${entry.previous ? ` (from ${entry.previous})` : ''}`;
    case 'complete_node':
      return `Completed: ${entry.node} — ${entry.summary}`;
    case 'request_context':
      return `Context: ${entry.glob} (${entry.matched?.length ?? 0} files, ${entry.totalBytes ?? 0}B)`;
    case 'flag_blocked':
      return `Blocked: ${entry.reason}`;
    case 'log_observation':
      return entry.text;
    case 'tool_call':
      return `Tool: ${entry.tool}${entry.paths?.length ? ` (${entry.paths.join(', ')})` : ''}`;
    case 'proxy_decision':
      return `Proxy: ${entry.tool} ${entry.allowed ? 'ALLOWED' : 'DENIED'}${entry.reason ? ` — ${entry.reason}` : ''}`;
    default:
      return JSON.stringify(entry);
  }
}

export const TracePanel: React.FC = () => {
  const { traceEntries, activeExplicit, sessions } = useStore();
  const [filter, setFilter] = useState<FilterKind>('all');

  const filtered = useMemo(() => {
    const kinds = kindToFilter[filter];
    const entries = kinds.length === 0
      ? traceEntries
      : traceEntries.filter(e => kinds.includes(e.kind));
    return [...entries].reverse();
  }, [traceEntries, filter]);

  // Check stuck
  const lastTransition = traceEntries
    .filter(e => e.kind === 'set_active_node')
    .at(-1);
  const stuckMinutes = lastTransition
    ? (Date.now() - new Date(lastTransition.ts).getTime()) / 60000
    : 0;
  const isStuck = stuckMinutes > 5 && activeExplicit !== null;

  const handleCopy = () => {
    const text = filtered.map(e => `${e.ts} [${e.kind}] ${formatEntry(e)}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm text-fg font-semibold flex-1">Trace</h2>
        {isStuck && (
          <span className="bg-danger text-fg text-xs px-2 py-0.5 rounded">
            Stuck ({Math.round(stuckMinutes)}m)
          </span>
        )}
        <button
          className="bg-node-bg border border-node-border rounded px-2 py-0.5 text-xs text-muted hover:text-fg"
          onClick={handleCopy}
        >
          Copy
        </button>
        {sessions.length > 0 && (
          <select
            className="bg-node-bg border border-node-border rounded px-2 py-0.5 text-xs text-fg"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                postMessage({ type: 'loadSession', file: e.target.value });
              }
            }}
          >
            <option value="">Sessions...</option>
            {sessions.map(s => (
              <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
            ))}
          </select>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1 mb-3">
        {(['all', 'state', 'context', 'blocks', 'proxy'] as FilterKind[]).map(f => (
          <button
            key={f}
            className={`px-2 py-0.5 rounded text-xs border ${
              filter === f
                ? 'bg-accent text-fg border-accent'
                : 'bg-node-bg text-muted border-node-border hover:border-accent'
            }`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-auto space-y-1">
        {filtered.length === 0 && (
          <div className="text-muted text-xs">No trace entries yet.</div>
        )}
        {filtered.map((entry, i) => {
          const isActiveTransition =
            entry.kind === 'set_active_node' && entry.node === activeExplicit;
          const time = new Date(entry.ts).toLocaleTimeString();

          return (
            <div
              key={i}
              className={`flex items-start gap-2 py-1 px-2 rounded text-xs ${
                isActiveTransition ? 'bg-accent/20' : 'hover:bg-node-bg'
              }`}
            >
              <span className="text-muted whitespace-nowrap">{time}</span>
              <span className={`${kindBadgeColors[entry.kind] ?? 'bg-node-border'} text-fg px-1 rounded text-[10px] whitespace-nowrap`}>
                {entry.kind.replace(/_/g, ' ')}
              </span>
              <span className="text-fg flex-1">{formatEntry(entry)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
