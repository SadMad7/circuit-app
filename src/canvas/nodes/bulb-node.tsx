/**
 * Bulb node — renders as an LED in the UI.
 * Domain kind: 'bulb'. UI label: "LED".
 * Terminal 'a' = anode (long leg / +), terminal 'b' = cathode (short leg / −).
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAppStore } from '../../state/store';
import type { AppNode } from './types';

export function BulbNode({ id }: NodeProps<AppNode>) {
  const solveResult = useAppStore((s) => s.solveResult);
  const state = solveResult?.components[id];
  const isActive = state?.status === 'active';

  return (
    <div className="relative flex items-center justify-center select-none cursor-default"
         style={{ width: 80, height: 80 }}>

      {/* Outer glow ring when active */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)',
            transform: 'scale(1.4)',
          }}
        />
      )}

      {/* Bulb body */}
      <div
        className={[
          'w-16 h-16 rounded-full flex flex-col items-center justify-center',
          'border-2 font-bold text-xs transition-all duration-400',
          isActive
            ? 'bg-amber-400 border-amber-300 text-amber-900 shadow-lg shadow-amber-400/60'
            : 'bg-slate-200 border-slate-300 text-slate-400',
        ].join(' ')}
      >
        {/* LED triangle symbol (simplified) */}
        <span className="text-lg leading-none">{isActive ? '💡' : '○'}</span>
        <span className="text-[9px] font-semibold uppercase tracking-widest opacity-70 mt-0.5">
          LED
        </span>
      </div>

      {/* Anode (a) — left side */}
      <Handle
        id={`${id}__a`}
        type="source"
        position={Position.Left}
        style={{ background: '#22c55e', border: '2px solid white', width: 12, height: 12 }}
        title="anode (+)"
      />

      {/* Cathode (b) — bottom */}
      <Handle
        id={`${id}__b`}
        type="source"
        position={Position.Bottom}
        style={{ background: '#ef4444', border: '2px solid white', width: 12, height: 12 }}
        title="cathode (−)"
      />
    </div>
  );
}
