/**
 * Lesson 1 — The complete loop
 *
 * Battery + LED pre-placed. One wire pre-drawn (LED cathode → battery negative).
 * User drags the missing wire from battery positive → LED anode to close the loop.
 *
 * New primitive: drag-to-wire between terminals.
 * Advancement: all components active (circuit closed).
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../../canvas/nodes/types';
import type { Lesson, HintScript } from '../types';
import { expectCircuitClosed } from '../validators';

// ---------------------------------------------------------------------------
// Component IDs (stable across the lesson — validators reference these)
// ---------------------------------------------------------------------------
const BATTERY_ID = 'battery-1';
const LED_ID     = 'led-1';

// ---------------------------------------------------------------------------
// Initial canvas state
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
    id: LED_ID,
    type: 'bulb',
    position: { x: 480, y: 220 },
    data: {
      kind: 'bulb',
      componentId: LED_ID,
      label: 'LED',
      resistanceOhm: 18,  // 9V / 18Ω = 500mA — conspicuously high; seeds Lesson 2
    },
  },
];

/**
 * Pre-drawn wire: LED cathode (b) → battery negative.
 * Handle ID convention: `${nodeId}__${terminal}`.
 * The missing wire is battery positive (right handle) → LED anode (left handle).
 */
const initialEdges: Edge[] = [
  {
    id: 'wire-pre-1',
    source: LED_ID,
    sourceHandle: `${LED_ID}__b`,
    target: BATTERY_ID,
    targetHandle: `${BATTERY_ID}__negative`,
    type: 'wire',
  },
];

// ---------------------------------------------------------------------------
// Hint copy
// ---------------------------------------------------------------------------

/**
 * Returns true when an edge exists directly connecting battery positive
 * to the LED cathode — the specific wrong-path the lesson plan calls out.
 * Needs edge inspection because SolveResult can't distinguish this from
 * "anode simply hasn't been wired yet" (both show as floating/dangling).
 */
function batteryPlusToLedCathode(edges: Edge[]): boolean {
  return edges.some(
    (e) =>
      (e.sourceHandle === `${BATTERY_ID}__positive` && e.targetHandle === `${LED_ID}__b`) ||
      (e.sourceHandle === `${LED_ID}__b`            && e.targetHandle === `${BATTERY_ID}__positive`),
  );
}

const hint: HintScript = (solveResult, edges) => {
  if (!solveResult) {
    return "The LED wants to light up, but the path isn't complete. Drag a wire from the battery's + terminal to the LED's longer leg (anode).";
  }

  const led     = solveResult.components[LED_ID];
  const battery = solveResult.components[BATTERY_ID];

  // Guard — shouldn't happen with wires pre-placed
  if (!led || !battery) {
    return "Drag a wire from the battery's + terminal to the LED's anode to close the circuit.";
  }

  if (led.status === 'floating') {
    // Wrong-terminal check first: battery+ wired to LED cathode specifically
    if (batteryPlusToLedCathode(edges)) {
      return "Almost — that leg is the cathode, the exit point. Try the other leg (the longer one).";
    }
    // Generic dangling or isolated-from-source fallback
    return "The LED wants to light up, but the path isn't complete. Drag a wire from the battery's + terminal to the LED's longer leg (anode).";
  }

  // Circuit is closed — advancement condition met
  return "The circuit is complete! Current is flowing through the LED. Notice how high that current reading is…";
};

// ---------------------------------------------------------------------------
// Lesson export
// ---------------------------------------------------------------------------

export const lesson01: Lesson = {
  id: 'lesson-01-complete-loop',
  title: 'The complete loop',
  concept: 'A circuit needs an unbroken path. Without it, nothing happens.',
  initialCanvas: {
    nodes: initialNodes,
    edges: initialEdges,
  },
  availablePaletteKinds: [], // no palette in Lesson 1 — drag-to-wire only
  hint,
  advancement: expectCircuitClosed(),
};
