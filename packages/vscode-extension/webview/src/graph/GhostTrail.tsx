import React from 'react';
import { getBezierPath } from '@xyflow/react';
import type { Edge as FlowEdge } from '@xyflow/react';

interface GhostTrailProps {
  trail: string[];
  nodePositions: Map<string, { x: number; y: number; width: number; height: number }>;
}

const OPACITIES = [1.0, 0.7, 0.4, 0.2, 0.1];

export const GhostTrail: React.FC<GhostTrailProps> = ({ trail, nodePositions }) => {
  if (trail.length < 2) return null;

  // Take last 5 transitions
  const recent = trail.slice(-6);
  const transitions: [string, string][] = [];
  for (let i = 0; i < recent.length - 1; i++) {
    transitions.push([recent[i], recent[i + 1]]);
  }

  // Reverse so newest is first (highest opacity)
  transitions.reverse();

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {transitions.map(([from, to], i) => {
        const fromPos = nodePositions.get(from);
        const toPos = nodePositions.get(to);
        if (!fromPos || !toPos) return null;

        const opacity = OPACITIES[Math.min(i, OPACITIES.length - 1)];

        return (
          <line
            key={`${from}-${to}-${i}`}
            x1={fromPos.x + fromPos.width}
            y1={fromPos.y + fromPos.height / 2}
            x2={toPos.x}
            y2={toPos.y + toPos.height / 2}
            stroke="#3a8580"
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
};
