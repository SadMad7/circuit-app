/**
 * Lesson 5 — Parallel resistors
 *
 * Battery + one 1 kΩ resistor wired directly across it. No bulb — deliberate:
 * a bulb would split the voltage and muddy "voltage is equal across parallel
 * branches". First bulb-free circuit in the curriculum. Real solver output at
 * start: 9 V across the resistor, 9 mA through it.
 *
 * New primitive: branch wiring. In the domain, electrical nodes are implicit
 * (shared NodeId strings on terminals), so "wire across the same two nodes"
 * physically means drawing wires to existing HANDLES that already sit on
 * those nodes. The first resistor's terminals glow as branch targets
 * (data.branchTarget); the palette drops in 'place' mode, creating a free
 * unwired resistor the user wires by hand. No auto-connect. Union-find in the
 * converter merges the new wires into the shared nodes — no solver changes.
 *
 * Wrong path: wiring the second resistor in series is a valid, solving
 * circuit — not an error — but not the goal. The series/parallel detector
 * (a topology-reading validator) classifies the mistake specifically and the
 * hint corrects it; the lesson does not advance.
 *
 * Advancement: second resistor active AND in parallel with the first
 * (detector returns 'parallel'). Result: R_eq = 500 Ω, 18 mA total, 9 V
 * unchanged across both branches, 9 mA each.
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../../canvas/nodes/types';
import type { Lesson, HintScript } from '../types';
import { allOf, expectComponentLit, expectParallel, classifyResistorPair } from '../validators';

// ---------------------------------------------------------------------------
// Component IDs (stable across the lesson)
// ---------------------------------------------------------------------------
const BATTERY_ID  = 'battery-1';
const RESISTOR_ID = 'resistor-1';

/**
 * The placed resistor's id. The place action assigns the next available
 * resistor index; resistor-1 is pre-placed, so the dropped 1 kΩ resistor is
 * always resistor-2.
 */
const RESISTOR_2_ID = 'resistor-2';

// ---------------------------------------------------------------------------
// Initial canvas state — 1 kΩ resistor directly across the battery
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
    position: { x: 420, y: 220 },
    data: {
      kind: 'resistor',
      componentId: RESISTOR_ID,
      label: '1 kΩ resistor',
      resistanceOhm: 1000,
      branchTarget: true, // terminals glow as branch-wiring targets
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
    target: BATTERY_ID,
    targetHandle: `${BATTERY_ID}__negative`,
    type: 'wire',
  },
];

// ---------------------------------------------------------------------------
// Hint copy (placeholder — final wording is later polish)
// ---------------------------------------------------------------------------

const hint: HintScript = (solveResult, _edges, circuit) => {
  const arrangement = classifyResistorPair(circuit, RESISTOR_ID, RESISTOR_2_ID);
  const second = solveResult?.components[RESISTOR_2_ID];

  if (arrangement === 'parallel' && second?.status === 'active') {
    return "Two paths means more current can flow — total resistance went down, not up. That's the key difference from series.";
  }

  if (arrangement === 'series') {
    return 'That puts them in series — same lane. Try connecting across the same two terminals as the first resistor.';
  }

  return 'This time, instead of adding to the line, connect the new resistor across the same two points — a parallel branch.';
};

// ---------------------------------------------------------------------------
// Lesson export
// ---------------------------------------------------------------------------

export const lesson05: Lesson = {
  id: 'lesson-05-parallel',
  title: 'Parallel resistors',
  concept: 'Parallel branches give current more paths. Total resistance drops.',
  initialCanvas: {
    nodes: initialNodes,
    edges: initialEdges,
  },
  palette: [
    { kind: 'resistor', label: '1 kΩ resistor', resistanceOhm: 1000 },
  ],
  paletteDropMode: 'place', // drop places a free resistor; the user wires it
  hint,
  advancement: allOf(
    expectComponentLit(RESISTOR_2_ID),
    expectParallel(RESISTOR_ID, RESISTOR_2_ID),
  ),
};
