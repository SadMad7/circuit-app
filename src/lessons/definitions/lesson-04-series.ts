/**
 * Lesson 4 — Series resistors
 *
 * Battery + one fixed 330 Ω resistor + LED, fully wired and active — exported
 * fresh here (lessons own their initial canvas state). No slider: that was
 * lesson-3-scoped. Real solver output at start: I ≈ 25.9 mA (9 V / 348 Ω).
 *
 * No new primitive. The user repeats lesson 2's drop-to-insert gesture with a
 * second resistor: dropping the 470 Ω resistor onto a wire splits it and
 * interposes the resistor in series. Total resistor resistance becomes 800 Ω
 * and current drops to ~11 mA — resistance adds, current is shared.
 *
 * Advancement: both resistors active + the standard dwell. No series
 * detection — in a single loop, two active resistors are necessarily in
 * series; the series/parallel detector is deferred to lesson 5.
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../../canvas/nodes/types';
import type { Lesson, HintScript } from '../types';
import { expectAllLit } from '../validators';

// ---------------------------------------------------------------------------
// Component IDs (stable across the lesson)
// ---------------------------------------------------------------------------
const BATTERY_ID  = 'battery-1';
const LED_ID      = 'led-1';
const RESISTOR_ID = 'resistor-1';

/**
 * The inserted resistor's id. The insert action assigns the next available
 * resistor index; this lesson starts with resistor-1 pre-placed, so the
 * dropped 470 Ω resistor is always resistor-2.
 */
const RESISTOR_2_ID = 'resistor-2';

// ---------------------------------------------------------------------------
// Initial canvas state — closed battery + resistor + LED loop
// ---------------------------------------------------------------------------

const initialNodes: AppNode[] = [
  {
    id: BATTERY_ID,
    type: 'battery',
    position: { x: 80, y: 220 },
    data: {
      kind: 'battery',
      componentId: BATTERY_ID,
      label: '9V battery',
      voltageV: 9,
    },
  },
  {
    id: RESISTOR_ID,
    type: 'resistor',
    position: { x: 280, y: 120 },
    data: {
      kind: 'resistor',
      componentId: RESISTOR_ID,
      label: '330 Ω resistor',
      resistanceOhm: 330, // fixed — no slider in this lesson
    },
  },
  {
    id: LED_ID,
    type: 'bulb',
    position: { x: 480, y: 220 },
    data: {
      kind: 'bulb',
      componentId: LED_ID,
      label: 'LED',
      resistanceOhm: 18,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'wire-loop-1',
    source: BATTERY_ID,
    sourceHandle: `${BATTERY_ID}__positive`,
    target: RESISTOR_ID,
    targetHandle: `${RESISTOR_ID}__a`,
    type: 'wire',
  },
  {
    id: 'wire-loop-2',
    source: RESISTOR_ID,
    sourceHandle: `${RESISTOR_ID}__b`,
    target: LED_ID,
    targetHandle: `${LED_ID}__a`,
    type: 'wire',
  },
  {
    id: 'wire-loop-3',
    source: LED_ID,
    sourceHandle: `${LED_ID}__b`,
    target: BATTERY_ID,
    targetHandle: `${BATTERY_ID}__negative`,
    type: 'wire',
  },
];

// ---------------------------------------------------------------------------
// Hint copy (placeholder — final wording is later polish)
// ---------------------------------------------------------------------------

const hint: HintScript = (solveResult) => {
  const second = solveResult?.components[RESISTOR_2_ID];

  if (second?.status === 'active') {
    return "Notice the current — it's the same at every point in the loop. Series circuits share current.";
  }

  return "You've got one resistor. What happens if you add another in the same line? Drop the second resistor onto the wire.";
};

// ---------------------------------------------------------------------------
// Lesson export
// ---------------------------------------------------------------------------

export const lesson04: Lesson = {
  id: 'lesson-04-series',
  title: 'Series resistors',
  concept: 'Resistors in series add up. Current is the same everywhere in the loop.',
  initialCanvas: {
    nodes: initialNodes,
    edges: initialEdges,
  },
  palette: [
    { kind: 'resistor', label: '470 Ω resistor', resistanceOhm: 470 },
  ],
  hint,
  advancement: expectAllLit(RESISTOR_ID, RESISTOR_2_ID),
};
