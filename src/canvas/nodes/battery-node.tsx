import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAppStore } from '../../state/store';
import type { AppNode } from './types';

export function BatteryNode({ id, data }: NodeProps<AppNode>) {
  const solveResult = useAppStore((s) => s.solveResult);
  const state = solveResult?.components[id];
  const isActive = state?.status === 'active';

  return (
    <div
      className={[
        'relative flex flex-col items-center justify-center',
        'w-32 h-16 rounded-xl select-none cursor-default',
        'border-2 font-bold text-white text-sm transition-all duration-300',
        isActive
          ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/40'
          : 'bg-slate-400 border-slate-300',
      ].join(' ')}
    >
      {/* Voltage label */}
      <span className="text-base font-extrabold leading-tight">
        {data.voltageV ?? 9}V
      </span>
      <span className="text-[10px] opacity-75 uppercase tracking-widest mt-0.5">
        battery
      </span>

      {/* Terminal labels */}
      <span className="absolute right-2 top-1 text-[10px] font-black opacity-90">+</span>
      <span className="absolute right-2 bottom-1 text-[10px] font-black opacity-90">−</span>

      {/* Positive terminal — right side, upper */}
      <Handle
        id={`${id}__positive`}
        type="source"
        position={Position.Right}
        style={{ top: '28%', background: '#22c55e', border: '2px solid white', width: 12, height: 12 }}
      />

      {/* Negative terminal — bottom */}
      <Handle
        id={`${id}__negative`}
        type="source"
        position={Position.Bottom}
        style={{ background: '#ef4444', border: '2px solid white', width: 12, height: 12 }}
      />
    </div>
  );
}
