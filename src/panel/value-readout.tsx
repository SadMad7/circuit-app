/**
 * Live V/I/R/P readout panel.
 * Reads SolveResult from the store and renders one row per component.
 * Updates live on every connect/disconnect — no polling.
 *
 * Display units: V (volts), mA (milliamps), Ω (ohms), mW (milliwatts).
 * Values below 1 mA are shown in µA to avoid "0.000 mA".
 */

import { useAppStore } from '../state/store';
import type { ComponentState } from '../domain/solve-result';
import type { AppNode } from '../canvas/nodes/types';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtV(v: number): string {
  return `${v.toFixed(2)} V`;
}

function fmtA(a: number): string {
  const mA = a * 1000;
  if (mA < 1 && a > 0) return `${(a * 1_000_000).toFixed(0)} µA`;
  return `${mA.toFixed(1)} mA`;
}

function fmtR(r: number | undefined): string {
  if (r === undefined) return '—';
  if (r >= 1000) return `${(r / 1000).toFixed(1)} kΩ`;
  return `${r} Ω`;
}

function fmtP(p: number): string {
  const mW = p * 1000;
  return `${mW.toFixed(1)} mW`;
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

interface ReadoutRowProps {
  node: AppNode;
  state: ComponentState | undefined;
}

function ReadoutRow({ node, state }: ReadoutRowProps) {
  const label = node.data.label || node.data.kind;
  const isActive = state?.status === 'active';

  return (
    <div
      className={[
        'p-3 rounded-lg border transition-all duration-300',
        isActive
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-slate-50 border-slate-100 opacity-60',
      ].join(' ')}
    >
      {/* Component label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}
        </span>
        {state ? (
          <span
            className={[
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest',
              isActive
                ? 'bg-green-100 text-green-700'
                : state.reason === 'dangling'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700',
            ].join(' ')}
          >
            {isActive ? 'active' : state.reason.replace('-', ' ')}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300">—</span>
        )}
      </div>

      {/* Values grid */}
      {isActive && state.status === 'active' && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Metric label="Voltage" value={fmtV(state.voltage)} color="text-blue-600" />
          <Metric label="Current" value={fmtA(state.current)} color="text-green-600" />
          {node.data.resistanceOhm !== undefined && (
            <Metric label="Resistance" value={fmtR(node.data.resistanceOhm)} color="text-orange-600" />
          )}
          <Metric label="Power" value={fmtP(state.power)} color="text-purple-600" />
        </div>
      )}

      {!isActive && (
        <p className="text-[11px] text-slate-400 italic">
          {state?.reason === 'dangling'
            ? 'Connect all terminals to see values.'
            : 'Complete the circuit to see values.'}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[9px] text-slate-400 uppercase tracking-widest">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ValueReadout() {
  const nodes       = useAppStore((s) => s.nodes);
  const solveResult = useAppStore((s) => s.solveResult);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-300 text-sm italic px-4 text-center">
        Load a lesson to see live values.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 mb-1">
        Live values
      </h2>
      {nodes.map((node) => (
        <ReadoutRow
          key={node.id}
          node={node}
          state={solveResult?.components[node.id]}
        />
      ))}
    </div>
  );
}
