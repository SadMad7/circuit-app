/**
 * Lesson 2 — The resistor as gatekeeper
 *
 * Battery + LED start fully wired in a closed loop — lesson 1's end state, but
 * exported fresh here (lessons own their initial canvas state). The LED draws
 * 500 mA (9 V / 18 Ω), far above the 300 mA warning line, so the value panel
 * shows the too-much-current treatment from the first solve.
 *
 * New primitive: drop a component onto an existing wire to insert it in series.
 * The user drags the 330 Ω resistor from the tray onto the battery-to-LED wire;
 * the insert action splits that wire around the resistor. Current drops to
 * ~25.9 mA (9 V / 348 Ω) and the warning clears — both derived from the live
 * solve, never set imperatively.
 *
 * Advancement: resistor active AND current below 0.3 A. Current-below-threshold
 * is sufficient (if current dropped, the resistor is necessarily in the loop);
 * series-detection is deferred to lesson 4.
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../../canvas/nodes/types';
import type { Lesson, HintScript } from '../types';
import { allOf, expectComponentLit, expectCurrentBelow } from '../validators';

// ---------------------------------------------------------------------------
// Component IDs (stable across the lesson — validators reference these)
// ---------------------------------------------------------------------------
const BATTERY_ID = 'battery-1';
const LED_ID     = 'led-1';

/**
 * The inserted resistor's id. The insert action assigns the next available
 * resistor index; this lesson starts with zero resistors, so the first (and
 * only) insert is always resistor-1.
 */
const RESISTOR_ID = 'resistor-1';

/** Warning threshold shared with the value panel's derived treatment. */
const SAFE_CURRENT_A = 0.3;

// ---------------------------------------------------------------------------
// Initial canvas state — closed battery + LED loop
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
      resistanceOhm: 18, // 9 V / 18 Ω = 500 mA — the problem this lesson fixes
    },
  },
];

/**
 * Both wires pre-drawn — the loop is closed and solving to active from the start.
 * The user inserts the resistor into wire-loop-1 (battery + → LED anode).
 */
const initialEdges: Edge[] = [
  {
    id: 'wire-loop-1',
    source: BATTERY_ID,
    sourceHandle: `${BATTERY_ID}__positive`,
    target: LED_ID,
    targetHandle: `${LED_ID}__a`,
    type: 'wire',
  },
  {
    id: 'wire-loop-2',
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
  const resistor = solveResult?.components[RESISTOR_ID];

  if (
    resistor?.status === 'active' &&
    resistor.current < SAFE_CURRENT_A
  ) {
    return 'The resistor is doing its job — the current dropped to a safe level and the LED is happy.';
  }

  return 'The LED is getting way too much current and would burn out. Drag the resistor onto the wire to slow the current down.';
};

// ---------------------------------------------------------------------------
// Lesson export
// ---------------------------------------------------------------------------

export const lesson02: Lesson = {
  id: 'lesson-02-resistor',
  title: 'The resistor as gatekeeper',
  concept: 'Resistors limit current. Too much current destroys components.',
  initialCanvas: {
    nodes: initialNodes,
    edges: initialEdges,
  },
  palette: [
    { kind: 'resistor', label: '330 Ω resistor', resistanceOhm: 330 },
  ],
  hint,
  advancement: allOf(
    expectComponentLit(RESISTOR_ID),
    expectCurrentBelow(RESISTOR_ID, SAFE_CURRENT_A),
  ),
};
