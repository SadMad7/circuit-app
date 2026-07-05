/**
 * solve() is the single UI-facing entry point for circuit evaluation.
 *
 * Phase 2 path:
 * 1. Convert React Flow graph data into the Circuit domain model.
 * 2. Classify topology as dangling, isolated-from-source, or active.
 * 3. If no components are active, skip numeric solving.
 * 4. Run the closed-loop Ohm's law solver for active components only.
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../canvas/nodes/types';
import type { ComponentState, SolveResult } from '../domain/solve-result';
import type { OhmsResult } from './ohms';
import { convertToCircuit } from '../canvas/converter';
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

export function solve(nodes: AppNode[], edges: Edge[]): SolveResult {
  if (nodes.length === 0) {
    return { components: {}, nodes: {} };
  }

  const circuit = convertToCircuit(nodes, edges);
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
