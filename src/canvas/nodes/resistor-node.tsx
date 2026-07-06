import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAppStore } from '../../state/store';
import type { AppNode } from './types';

/** Format resistance value with Ω and appropriate unit prefix. */
function formatResistance(ohm: number): string {
  if (ohm >= 1000) return `${ohm / 1000}kΩ`;
  return `${ohm}Ω`;
}

export function ResistorNode({ id, data }: NodeProps<AppNode>) {
  const solveResult = useAppStore((s) => s.solveResult);
  const setResistance = useAppStore((s) => s.setResistance);
  const state = solveResult?.components[id];
  const isActive = state?.status === 'active';
  const R = data.resistanceOhm ?? 330;

  // Live handle position during a slider drag — visual feedback only.
  // Solved values update on release, when the value is committed to the store.
  const [dragOhm, setDragOhm] = useState<number | null>(null);
  const shownR = dragOhm ?? R;

  const commitDrag = () => {
    if (dragOhm !== null && dragOhm !== R) {
      setResistance(id, dragOhm);
    }
    setDragOhm(null);
  };

  // Branch-target affordance (lesson 5): the terminals glow as valid targets
  // for the branch-wiring gesture. Styling only — connection behavior is
  // unchanged. The pulsing ring is drawn behind each handle so the handle
  // itself stays hittable.
  const isBranchTarget = data.branchTarget === true;
  const handleStyle = isBranchTarget
    ? {
        background: '#10b981',
        border: '2px solid white',
        width: 16,
        height: 16,
        boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.35)',
      }
    : {
        background: '#a78bfa',
        border: '2px solid white',
        width: 12,
        height: 12,
      };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={[
          'relative flex flex-col items-center justify-center',
          'w-28 h-12 rounded-lg select-none cursor-default',
          'border-2 font-semibold text-white text-xs transition-all duration-300',
          isActive
            ? 'bg-orange-500 border-orange-400 shadow-md shadow-orange-400/40'
            : 'bg-slate-400 border-slate-300',
        ].join(' ')}
      >
        {/* Resistance bands (decorative stripes) */}
        <div className="absolute inset-0 flex items-center justify-around px-3 pointer-events-none overflow-hidden rounded-lg">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-full opacity-30"
              style={{ background: ['#92400e', '#fbbf24', '#a16207'][i] }}
            />
          ))}
        </div>

        <span className="relative z-10 text-[11px] font-bold">{formatResistance(shownR)}</span>
        <span className="relative z-10 text-[9px] opacity-70 uppercase tracking-widest">
          resistor
        </span>

        {/* Branch-target pulse rings — decorative, behind the handles */}
        {isBranchTarget && (
          <>
            <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-400 opacity-60 animate-ping pointer-events-none" />
            <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-400 opacity-60 animate-ping pointer-events-none" />
          </>
        )}

        {/* Terminal a — left */}
        <Handle
          id={`${id}__a`}
          type="source"
          position={Position.Left}
          style={handleStyle}
        />

        {/* Terminal b — right */}
        <Handle
          id={`${id}__b`}
          type="source"
          position={Position.Right}
          style={handleStyle}
        />
      </div>

      {/* Branch-target caption — tells the user what the glow means */}
      {isBranchTarget && (
        <span className="text-[9px] font-semibold text-emerald-600 tracking-wide">
          connect here
        </span>
      )}

      {/* Resistance slider — present only when the lesson enables it (lesson 3).
          nodrag stops React Flow from treating the drag as a node move. */}
      {data.slider && (
        <div className="nodrag flex flex-col items-center gap-0.5 w-32 px-2 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
          <input
            type="range"
            min={data.slider.min}
            max={data.slider.max}
            step={10}
            value={shownR}
            onChange={(e) => setDragOhm(Number(e.target.value))}
            onPointerUp={commitDrag}
            onBlur={commitDrag}
            className="w-full accent-orange-500 cursor-pointer"
            aria-label="Resistance"
          />
          <span className="text-[9px] font-semibold text-slate-500 tracking-wide">
            V = I × R
          </span>
        </div>
      )}
    </div>
  );
}
