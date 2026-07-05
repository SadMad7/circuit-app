/**
 * solve() is the single UI-facing entry point for circuit evaluation.
 *
 * The solver is a pure function of the Circuit domain model — it does not know
 * about React Flow. Callers convert their graph (convertToCircuit) before calling.
 *
 * Phase 2 path:
 * 1. Classify topology as dangling, isolated-from-source, or active.
 * 2. If no components are active, skip numeric solving.
 * 3. Run the closed-loop Ohm's law solver for active components only.
 */

import type { Circuit } from '../domain/circuit';
import type { ComponentState, SolveResult } from '../domain/solve-result';
import type { OhmsResult } from './ohms';
import { classifyTopology } from './topology';
import { solveOhms } from './ohms';

/**
 * Maps OhmsResult failures to the one UI-visible unsolvable state.
 *
 * The closed failure set is:
 * - short-circuit
 * - conflicting-sources
 * - not-reducible
 *
 * All three flatten to floating/unsolvable for every component topology had
 * already marked active.
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

export function solve(circuit: Circuit): SolveResult {
  if (circuit.components.length === 0) {
    return { components: {}, nodes: {} };
  }

  const classifications = classifyTopology(circuit);
  const activeIds = Object.entries(classifications)
    .filter(([, state]) => state.status === 'active')
    .map(([componentId]) => componentId);

  if (activeIds.length === 0) {
    return { components: classifications, nodes: {} };
  }

  const ohmsResult = solveOhms(circuit, new Set(activeIds));
  const components = {
    ...classifications,
    ...applyOhmsResult(ohmsResult, activeIds),
  };

  return {
    components,
    nodes: ohmsResult.ok ? ohmsResult.nodes : {},
  };
}
