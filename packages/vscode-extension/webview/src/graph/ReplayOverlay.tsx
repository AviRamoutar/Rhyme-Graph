import React, { useState } from 'react';
import type { TraceEntry } from '../store';

interface ReplayOverlayProps {
  entries: TraceEntry[];
  nodePositions: Map<string, { x: number; y: number; width: number; height: number }>;
}

export const ReplayOverlay: React.FC<ReplayOverlayProps> = ({ entries, nodePositions }) => {
  const [step, setStep] = useState(0);

  const transitions = entries.filter(e => e.kind === 'set_active_node');
  if (transitions.length === 0) return null;

  const visibleTransitions = transitions.slice(0, step + 1);
  const lines: [string, string][] = [];
  for (let i = 0; i < visibleTransitions.length - 1; i++) {
    lines.push([visibleTransitions[i].node, visibleTransitions[i + 1].node]);
  }

  return (
    <div className="absolute bottom-2 left-2 right-2 z-20">
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {lines.map(([from, to], i) => {
          const fromPos = nodePositions.get(from);
          const toPos = nodePositions.get(to);
          if (!fromPos || !toPos) return null;
          return (
            <line
              key={`replay-${i}`}
              x1={fromPos.x + fromPos.width}
              y1={fromPos.y + fromPos.height / 2}
              x2={toPos.x}
              y2={toPos.y + toPos.height / 2}
              stroke="#d4a017"
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={0.8}
            />
          );
        })}
      </svg>
      <div className="bg-node-bg border border-node-border rounded p-2 flex items-center gap-2">
        <span className="text-xs text-muted">Replay</span>
        <input
          type="range"
          min={0}
          max={transitions.length - 1}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-fg">
          {step + 1}/{transitions.length}
        </span>
      </div>
    </div>
  );
};
