/**
 * Component tray — shows draggable component chips for the current lesson.
 * In Lesson 1 the palette is empty (availablePaletteKinds = []).
 * Lessons 2+ supply resistors etc. from the lesson definition.
 *
 * Drag-to-canvas is handled by React Flow's drag-and-drop node creation.
 * The user drags a chip, drops it on the canvas → a new node is created at drop position.
 *
 * Phase 1: only the chip UI is built. Actual drop-to-create wiring is Phase 3.
 */

import type { ComponentKind } from '../domain/component';

interface PaletteProps {
  availableKinds: ComponentKind[];
}

const CHIP_META: Record<ComponentKind, { label: string; color: string; emoji: string }> = {
  battery:  { label: 'Battery',  color: 'bg-blue-100 text-blue-800 border-blue-300',    emoji: '🔋' },
  resistor: { label: 'Resistor', color: 'bg-orange-100 text-orange-800 border-orange-300', emoji: '▭' },
  bulb:     { label: 'LED',      color: 'bg-amber-100 text-amber-800 border-amber-300',  emoji: '💡' },
  switch:   { label: 'Switch',   color: 'bg-purple-100 text-purple-800 border-purple-300', emoji: '⎋' },
};

export function Palette({ availableKinds }: PaletteProps) {
  if (availableKinds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mr-1">
        Components
      </span>
      {availableKinds.map((kind) => {
        const meta = CHIP_META[kind];
        return (
          <div
            key={kind}
            draggable
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border',
              'text-xs font-semibold cursor-grab active:cursor-grabbing',
              'select-none transition-transform hover:scale-105 active:scale-95',
              meta.color,
            ].join(' ')}
            title={`Drag to add a ${meta.label}`}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}
