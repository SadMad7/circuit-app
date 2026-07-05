/**
 * Component tray — shows draggable component chips for the current lesson.
 * In Lesson 1 the palette is empty (lesson.palette = []).
 * Lessons 2+ supply entries from the lesson definition; each entry owns its
 * component value (e.g. 330 Ω), which the insert action reads on drop.
 *
 * Drag payload: the PaletteEntry as JSON under PALETTE_DND_MIME. The canvas's
 * drop handler parses it and asks the store to insert the component onto the
 * wire under the cursor.
 */

import type { ComponentKind } from '../domain/component';
import type { PaletteEntry } from '../lessons/types';

/** dataTransfer type for palette chips (custom MIME types must be lowercase). */
export const PALETTE_DND_MIME = 'application/x-circuitlingo-component';

interface PaletteProps {
  entries: PaletteEntry[];
}

const CHIP_META: Record<ComponentKind, { color: string; emoji: string }> = {
  battery:  { color: 'bg-blue-100 text-blue-800 border-blue-300',      emoji: '🔋' },
  resistor: { color: 'bg-orange-100 text-orange-800 border-orange-300', emoji: '▭' },
  bulb:     { color: 'bg-amber-100 text-amber-800 border-amber-300',    emoji: '💡' },
  switch:   { color: 'bg-purple-100 text-purple-800 border-purple-300', emoji: '⎋' },
};

export function Palette({ entries }: PaletteProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mr-1">
        Components
      </span>
      {entries.map((entry) => {
        const meta = CHIP_META[entry.kind];
        return (
          <div
            key={`${entry.kind}-${entry.label}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(PALETTE_DND_MIME, JSON.stringify(entry));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border',
              'text-xs font-semibold cursor-grab active:cursor-grabbing',
              'select-none transition-transform hover:scale-105 active:scale-95',
              meta.color,
            ].join(' ')}
            title={`Drag the ${entry.label} onto a wire`}
          >
            <span>{meta.emoji}</span>
            <span>{entry.label}</span>
          </div>
        );
      })}
    </div>
  );
}
