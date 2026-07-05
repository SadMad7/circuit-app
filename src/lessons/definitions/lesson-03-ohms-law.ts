/**
 * Lesson 3 — Ohm's law
 *
 * Battery + 330 Ω resistor + LED, fully wired and active — lesson 2's end
 * result, but exported fresh here (lessons own their initial canvas state).
 * Real solver output at start: I ≈ 25.9 mA (9 V / 348 Ω), voltage split
 * across resistor and bulb.
 *
 * New primitive: component-value slider. The lesson enables a 100 Ω–1 kΩ
 * slider on the resistor via node data (data.slider) — it is not an intrinsic
 * resistor property; resistors in other lessons render no slider. The slider
 * commits on release, and the committed value flows through the normal
 * convertToCircuit → solve path.
 *
 * Advancement is interaction HISTORY, not circuit state: the user must commit
 * the resistance into both the high zone (>= 700 Ω) and the low zone
 * (<= 300 Ω) during the session, in any order. That fact is not derivable
 * from the current circuit, so it lives in `sliderGoal` (tracked by the
 * lesson player), not in a SolveResult-reading validator. Zone bounds are
 * starting values — tune in-browser for feel.
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../../canvas/nodes/types';
import type { Lesson, HintScript } from '../types';

// ---------------------------------------------------------------------------
// Component IDs (stable across the lesson)
// ---------------------------------------------------------------------------
const BATTERY_ID  = 'battery-1';
const LED_ID      = 'led-1';
const RESISTOR_ID = 'resistor-1';

// Slider range and forgiving zone bounds (ohms) — starting values, tune for feel.
const SLIDER_MIN = 100;
const SLIDER_MAX = 1000;
const LOW_ZONE_MAX  = 300;
const HIGH_ZONE_MIN = 700;

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
      label: 'resistor',
      resistanceOhm: 330,
      slider: { min: SLIDER_MIN, max: SLIDER_MAX }, // lesson 3 only
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
//
// Hints respond to the COMMITTED value: solve fires on release, so the
// resistor's solved V/I only change when a value is committed — no mid-drag
// flicker. The committed resistance is recovered from the solve itself
// (R = V / I), keeping the hint a pure function of SolveResult.
// ---------------------------------------------------------------------------

const hint: HintScript = (solveResult) => {
  const resistor = solveResult?.components[RESISTOR_ID];

  if (resistor?.status === 'active' && resistor.current > 0) {
    const committedOhm = resistor.voltage / resistor.current;

    if (committedOhm >= HIGH_ZONE_MIN) {
      return 'More resistance, less current — the LED dims. Now try the other direction.';
    }
    if (committedOhm <= LOW_ZONE_MAX) {
      return "Less resistance, more current — brighter, but don't go too low.";
    }
  }

  return "Drag the slider to change the resistor's value. Watch what happens to the current.";
};

// ---------------------------------------------------------------------------
// Lesson export
// ---------------------------------------------------------------------------

export const lesson03: Lesson = {
  id: 'lesson-03-ohms-law',
  title: "Ohm's law",
  concept: 'V = I × R. Change one and the others respond instantly.',
  initialCanvas: {
    nodes: initialNodes,
    edges: initialEdges,
  },
  palette: [], // locked — lesson 3 is about adjusting, not building
  hint,
  sliderGoal: {
    componentId: RESISTOR_ID,
    lowMax: LOW_ZONE_MAX,
    highMin: HIGH_ZONE_MIN,
  },
};
