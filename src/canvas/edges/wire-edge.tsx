/**
 * Custom wire edge.
 * Renders as a smooth Bezier path. Glows indigo when the source component is active,
 * gray otherwise. Stroke width is thicker than React Flow defaults for a tactile feel.
 */

import {
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { useAppStore } from '../../state/store';

export function WireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
}: EdgeProps<Edge>) {
  const solveResult = useAppStore((s) => s.solveResult);

  // Wire is "live" when both endpoints belong to active components
  const sourceState = solveResult?.components[source];
  const targetState = solveResult?.components[target];
  const isLive =
    sourceState?.status === 'active' && targetState?.status === 'active';

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Glow layer when live */}
      {isLive && (
        <path
          id={`${id}-glow`}
          d={edgePath}
          stroke="#6366f1"
          strokeWidth={8}
          strokeOpacity={0.25}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Main wire */}
      <path
        id={id}
        d={edgePath}
        stroke={isLive ? '#4f46e5' : '#94a3b8'}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        className="transition-all duration-300"
      />
    </>
  );
}
