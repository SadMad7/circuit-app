/**
 * Shape-based mock fixtures for Phase 1.
 *
 * Each fixture describes a canonical circuit topology and supplies the V/I/P values
 * for every component in that topology. The solver iterates fixtures in order and
 * returns the first match. Unrecognised shapes leave components as floating.
 *
 * Matching is done on the React Flow graph — component count + kinds only.
 * Node IDs are NOT part of the match; that keeps fixtures lesson-agnostic.
 *
 * Canonical shapes:
 *   1. battery + bulb                       (Lesson 1 — conspicuously high current)
 *   2. battery + 1 resistor + bulb          (Lesson 2 & 3 — normal operating current)
 *   3. battery + 2 resistors(series) + bulb (Lesson 4 — two series resistors)
 *   4. battery + 2 resistors(parallel)      (Lesson 5 — parallel branch)
 *
 * Values are approximate and chosen for legibility, not physical accuracy.
 * Phase 2 (ohms.ts) will compute real values from component parameters.
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../canvas/nodes/types';
import type { ComponentKind } from '../domain/component';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveValues = { voltage: number; current: number; power: number };

export interface Fixture {
  /**
   * Returns true when this fixture matches the current active (closed-loop) graph.
   * Only called when reachability.ts has already confirmed all components are active.
   */
  matches: (nodes: AppNode[], edges: Edge[]) => boolean;
  /**
   * Returns a map of componentId → active V/I/P values.
   * Receives the full node list so it can inspect per-component parameters (e.g. resistanceOhm).
   */
  result: (nodes: AppNode[]) => Record<string, ActiveValues>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countKind(nodes: AppNode[], kind: ComponentKind): number {
  return nodes.filter((n) => n.data.kind === kind).length;
}

function nodesOfKind(nodes: AppNode[], kind: ComponentKind): AppNode[] {
  return nodes.filter((n) => n.data.kind === kind);
}

// ---------------------------------------------------------------------------
// Fixture 1 — battery + bulb (no resistor)
// Conspicuously high current; seeds Lesson 2's "too bright" concept.
// 9 V / ~18 Ω (LED forward resistance approximation) ≈ 500 mA
// ---------------------------------------------------------------------------

const batteryPlusBulb: Fixture = {
  matches: (nodes) =>
    countKind(nodes, 'battery') === 1 &&
    countKind(nodes, 'bulb') === 1 &&
    countKind(nodes, 'resistor') === 0,

  result: (nodes) => {
    const battery = nodesOfKind(nodes, 'battery')[0];
    const bulb    = nodesOfKind(nodes, 'bulb')[0];
    const V = battery.data.voltageV ?? 9;
    const I = 0.5; // 500 mA — dangerously high
    return {
      [battery.id]: { voltage: V,     current: I,  power: V * I  },
      [bulb.id]:    { voltage: V,     current: I,  power: V * I  },
    };
  },
};

// ---------------------------------------------------------------------------
// Fixture 2 — battery + 1 resistor + bulb (series)
// Normal operating range. Uses actual resistanceOhm from node data.
// Bulb modelled as ~0 Ω (all voltage across resistor).
// ---------------------------------------------------------------------------

const batteryResistorBulb: Fixture = {
  matches: (nodes) =>
    countKind(nodes, 'battery') === 1 &&
    countKind(nodes, 'resistor') === 1 &&
    countKind(nodes, 'bulb') === 1,

  result: (nodes) => {
    const battery  = nodesOfKind(nodes, 'battery')[0];
    const resistor = nodesOfKind(nodes, 'resistor')[0];
    const bulb     = nodesOfKind(nodes, 'bulb')[0];
    const V = battery.data.voltageV ?? 9;
    const R = resistor.data.resistanceOhm ?? 330;
    const I = V / R;
    return {
      [battery.id]:  { voltage: V,     current: I,     power: V * I      },
      [resistor.id]: { voltage: I * R, current: I,     power: I * I * R  },
      [bulb.id]:     { voltage: 0,     current: I,     power: 0          },
    };
  },
};

// ---------------------------------------------------------------------------
// Fixture 3 — battery + 2 resistors (series) + bulb
// R_total = R1 + R2. Per-component voltages visible.
// ---------------------------------------------------------------------------

const batteryTwoSeriesResistorsBulb: Fixture = {
  matches: (nodes) =>
    countKind(nodes, 'battery') === 1 &&
    countKind(nodes, 'resistor') === 2 &&
    countKind(nodes, 'bulb') === 1,

  result: (nodes) => {
    const battery    = nodesOfKind(nodes, 'battery')[0];
    const resistors  = nodesOfKind(nodes, 'resistor');
    const bulb       = nodesOfKind(nodes, 'bulb')[0];
    const V    = battery.data.voltageV ?? 9;
    const R1   = resistors[0].data.resistanceOhm ?? 330;
    const R2   = resistors[1].data.resistanceOhm ?? 470;
    const Rtot = R1 + R2;
    const I    = V / Rtot;
    return {
      [battery.id]:     { voltage: V,      current: I, power: V * I      },
      [resistors[0].id]:{ voltage: I * R1, current: I, power: I * I * R1 },
      [resistors[1].id]:{ voltage: I * R2, current: I, power: I * I * R2 },
      [bulb.id]:        { voltage: 0,      current: I, power: 0          },
    };
  },
};

// ---------------------------------------------------------------------------
// Fixture 4 — battery + 2 resistors (parallel, no bulb)
// R_total = (R1 * R2) / (R1 + R2). Total current splits across branches.
// ---------------------------------------------------------------------------

const batteryTwoParallelResistors: Fixture = {
  matches: (nodes) =>
    countKind(nodes, 'battery') === 1 &&
    countKind(nodes, 'resistor') === 2 &&
    countKind(nodes, 'bulb') === 0,

  result: (nodes) => {
    const battery   = nodesOfKind(nodes, 'battery')[0];
    const resistors = nodesOfKind(nodes, 'resistor');
    const V    = battery.data.voltageV ?? 9;
    const R1   = resistors[0].data.resistanceOhm ?? 1000;
    const R2   = resistors[1].data.resistanceOhm ?? 1000;
    const Rtot = (R1 * R2) / (R1 + R2);
    const Itot = V / Rtot;
    const I1   = V / R1;
    const I2   = V / R2;
    return {
      [battery.id]:      { voltage: V, current: Itot, power: V * Itot },
      [resistors[0].id]: { voltage: V, current: I1,   power: V * I1   },
      [resistors[1].id]: { voltage: V, current: I2,   power: V * I2   },
    };
  },
};

// ---------------------------------------------------------------------------
// Exported fixture list — solver iterates in order, returns first match
// ---------------------------------------------------------------------------

export const FIXTURES: Fixture[] = [
  batteryTwoParallelResistors,   // more specific (no bulb) — checked before series+bulb
  batteryTwoSeriesResistorsBulb,
  batteryResistorBulb,
  batteryPlusBulb,
];
