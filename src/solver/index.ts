/**
 * solve() — the single entry point for circuit evaluation.
 *
 * Phase 1 (current):
 *   1. classifyComponents() from reachability.ts — DFS on the React Flow graph
 *      to detect dangling terminals and isolated-from-source components.
 *   2. If all components are active, run FIXTURES.find() to overlay real V/I/P values
 *      for recognised circuit shapes. Unrecognised shapes return all floating.
 *
 * Phase 2 (after Codex delivers converter.ts + topology.ts + ohms.ts):
 *   Replace steps 1–2 with: convertToCircuit() → classifyTopology() → solveOhms().
 *   The return type (SolveResult) is identical — the UI does not change.
 *
 * Call sites: Zustand store's onConnect / onEdgesChange handlers.
 * Do NOT call during mid-drag (wire not yet connected = open circuit; skip the solve).
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../canvas/nodes/types';
import type { SolveResult, ComponentState } from '../domain/solve-result';
import type { OhmsResult } from './ohms';
import { classifyComponents } from './reachability';
import { FIXTURES } from './mock-fixtures';

/**
 * Maps an OhmsResult to per-component states.
 * Phase 2 wires this into the solve() body after classifyTopology() + solveOhms().
 * Not called in Phase 1 — the mock path never invokes ohms.ts.
 *
 * Mapping contract: any ok:false result (not-reducible, short-circuit, conflicting-sources)
 * maps every active component to `floating/unsolvable`. The specific reason code is for
 * debugging only; the UI collapses all error cases to the same unsolvable rendering.
 */
export function applyOhmsResult(
  result: OhmsResult,
  activeIds: string[],
): Record<string, ComponentState> {
  if (result.ok) return result.components;
  return Object.fromEntries(
    activeIds.map((id) => [
      id,
      { status: 'floating' as const, reason: 'unsolvable' as const },
    ]),
  );
}

export function solve(nodes: AppNode[], edges: Edge[]): SolveResult {
  if (nodes.length === 0) {
    return { components: {}, nodes: {} };
  }

  // Step 1 — classify every component (dangling / isolated / active-placeholder)
  const classifications = classifyComponents(nodes, edges);

  // Step 2 — if any component is not active, return early with the floating states
  const allActive = Object.values(classifications).every(
    (s) => s.status === 'active',
  );

  if (!allActive) {
    return { components: classifications, nodes: {} };
  }

  // Step 3 — circuit is closed; find a matching fixture for V/I/P values
  const fixture = FIXTURES.find((f) => f.matches(nodes, edges));

  if (!fixture) {
    // Unrecognised topology — treat everything as isolated so the UI
    // doesn't show stale or nonsensical values
    const isolated: Record<string, ComponentState> = Object.fromEntries(
      nodes.map((n) => [
        n.id,
        { status: 'floating' as const, reason: 'isolated-from-source' as const },
      ]),
    );
    return { components: isolated, nodes: {} };
  }

  // Step 4 — overlay real V/I/P from the matched fixture
  const values = fixture.result(nodes);

  const components: Record<string, ComponentState> = Object.fromEntries(
    nodes.map((n) => {
      const v = values[n.id];
      if (!v) {
        // Component recognised in circuit but not in fixture result — shouldn't happen
        return [n.id, { status: 'floating' as const, reason: 'isolated-from-source' as const }];
      }
      return [
        n.id,
        { status: 'active' as const, voltage: v.voltage, current: v.current, power: v.power },
      ];
    }),
  );

  return { components, nodes: {} };
}
