/**
 * App shell — layout only. No logic lives here.
 *
 * Layout (portrait-first, responsive):
 * ┌─────────────────────────────────────────────┐
 * │  Lesson player (hint + progress)   ~88px    │
 * ├────────────────────────────┬────────────────┤
 * │  Circuit canvas            │  Value readout │
 * │  (flex 1, React Flow)      │  (w-72)        │
 * ├────────────────────────────┴────────────────┤
 * │  Palette tray (hidden when empty)   ~56px   │
 * └─────────────────────────────────────────────┘
 */

import { CircuitCanvas } from '../canvas/canvas';
import { LessonPlayer }  from '../lessons/player';
import { Palette }       from '../palette/palette';
import { ValueReadout }  from '../panel/value-readout';
import { useAppStore }   from '../state/store';
import { lesson01 }      from '../lessons/definitions/lesson-01-complete-loop';
import type { Lesson }   from '../lessons/types';
import type { ComponentKind } from '../domain/component';

// Lesson registry — Phase 3 will grow this list
const LESSON_MAP: Record<string, Lesson> = {
  [lesson01.id]: lesson01,
};

export function App() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);

  const paletteKinds: ComponentKind[] =
    LESSON_MAP[currentLessonId]?.availablePaletteKinds ?? [];

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans">
      {/* ── Header / lesson player ─────────────────────────── */}
      <header className="shrink-0 h-24 bg-white border-b border-slate-200 shadow-sm px-4">
        <LessonPlayer />
      </header>

      {/* ── Main area ─────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0 gap-3 p-3">
        {/* Canvas */}
        <div className="flex flex-col flex-1 min-w-0">
          <CircuitCanvas />
          <Palette availableKinds={paletteKinds} />
        </div>

        {/* Value readout sidebar */}
        <aside className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <ValueReadout />
        </aside>
      </main>
    </div>
  );
}
