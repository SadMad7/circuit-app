/**
 * Validator factory functions.
 *
 * Every lesson composes its advancement predicate from these factories.
 * No lesson definition hand-rolls check logic — it only calls these.
 *
 * All predicates return false when solveResult is null (circuit not yet solved).
 */

import type { SolveResult } from '../domain/solve-result';
import type { Circuit } from '../domain/circuit';
import type { ValidatorPredicate } from './types';

// ---------------------------------------------------------------------------
// Component-level factories
// ---------------------------------------------------------------------------

/**
 * True when the named component is active (part of a closed loop).
 * "Lit" is the UI framing — works equally for bulbs, resistors, or any component.
 */
export const expectComponentLit = (componentId: string): ValidatorPredicate =>
  (solveResult: SolveResult | null) => {
    if (!solveResult) return false;
    return solveResult.components[componentId]?.status === 'active';
  };

/**
 * True when all listed components are active simultaneously.
 */
export const expectAllLit = (...componentIds: string[]): ValidatorPredicate =>
  (solveResult: SolveResult | null) => {
    if (!solveResult) return false;
    return componentIds.every(
      (id) => solveResult.components[id]?.status === 'active',
    );
  };

/**
 * True when the named component is active AND its voltage is within
 * `tolerancePct` percent of `targetV`.
 *
 * @param tolerancePct  Percentage tolerance (default 15 % — Phase 1 mock values
 *                      are rounded; Phase 2 real values will be tighter).
 */
export const expectVoltageAcross = (
  componentId: string,
  targetV: number,
  tolerancePct = 15,
): ValidatorPredicate =>
  (solveResult: SolveResult | null) => {
    if (!solveResult) return false;
    const state = solveResult.components[componentId];
    if (state?.status !== 'active') return false;
    const delta = Math.abs(state.voltage - targetV);
    return delta / Math.max(targetV, 0.001) <= tolerancePct / 100;
  };

/**
 * True when the named component is active AND its current is within
 * `tolerancePct` percent of `targetA` (amperes).
 */
export const expectCurrentThrough = (
  componentId: string,
  targetA: number,
  tolerancePct = 15,
): ValidatorPredicate =>
  (solveResult: SolveResult | null) => {
    if (!solveResult) return false;
    const state = solveResult.components[componentId];
    if (state?.status !== 'active') return false;
    const delta = Math.abs(state.current - targetA);
    return delta / Math.max(targetA, 0.0001) <= tolerancePct / 100;
  };

/**
 * True when the named component is active AND its current is strictly below
 * `thresholdA` (amperes). Used for "bring the current down to safe" goals
 * (Lesson 2 — current below 0.3 A after the resistor is inserted).
 */
export const expectCurrentBelow = (
  componentId: string,
  thresholdA: number,
): ValidatorPredicate =>
  (solveResult: SolveResult | null) => {
    if (!solveResult) return false;
    const state = solveResult.components[componentId];
    if (state?.status !== 'active') return false;
    return state.current < thresholdA;
  };

/**
 * True when every component in the circuit is active.
 * Useful for "close the loop" goals (Lesson 1).
 */
export const expectCircuitClosed = (): ValidatorPredicate =>
  (solveResult: SolveResult | null) => {
    if (!solveResult) return false;
    const states = Object.values(solveResult.components);
    if (states.length === 0) return false;
    return states.every((s) => s.status === 'active');
  };

// ---------------------------------------------------------------------------
// Topology-reading factories (lesson 5)
//
// These read the converted Circuit's terminal NodeIds — wiring topology, not
// solved values. They compute no physics; their only job is lesson flow
// (which hint to show, whether to advance), which is why they live here with
// the validators and not in the solver. Nothing in the solve path calls them.
// ---------------------------------------------------------------------------

/**
 * Classifies how two resistors relate in the wired circuit.
 *
 *   'parallel' — they span the same two distinct nodes
 *   'series'   — they share exactly one node (directly adjacent in a chain)
 *   'none'     — either is missing, self-shorted, or they share no node
 *
 * Built for lesson 5's two-resistor case only — no chains through other
 * components, no mixed arrangements.
 */
export function classifyResistorPair(
  circuit: Circuit,
  idA: string,
  idB: string,
): 'series' | 'parallel' | 'none' {
  const a = circuit.components.find((c) => c.id === idA);
  const b = circuit.components.find((c) => c.id === idB);
  if (!a || !b) return 'none';

  const aNodes = Object.values(a.terminals);
  const bNodes = Object.values(b.terminals);

  // Self-shorted components (both terminals on one node) are never a valid
  // series or parallel arrangement — don't let them masquerade as parallel.
  const aDistinct = new Set(aNodes).size === 2;
  const bDistinct = new Set(bNodes).size === 2;
  if (!aDistinct || !bDistinct) return 'none';

  const aSet = new Set(aNodes);
  const shared = bNodes.filter((n) => aSet.has(n)).length;

  if (shared === 2) return 'parallel';
  if (shared === 1) return 'series';
  return 'none';
}

/**
 * True when both components are wired in parallel — spanning the same two
 * distinct nodes. Lesson 5's advancement check (composed with an active
 * check so an unwired-but-parallel-looking arrangement can't advance).
 */
export const expectParallel = (idA: string, idB: string): ValidatorPredicate =>
  (solveResult, circuit) => {
    void solveResult; // topology-only — reads wiring, not solved values
    return classifyResistorPair(circuit, idA, idB) === 'parallel';
  };

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

/** True when ALL predicates pass. */
export const allOf = (...predicates: ValidatorPredicate[]): ValidatorPredicate =>
  (solveResult, circuit) => predicates.every((p) => p(solveResult, circuit));

/** True when ANY predicate passes. */
export const anyOf = (...predicates: ValidatorPredicate[]): ValidatorPredicate =>
  (solveResult, circuit) => predicates.some((p) => p(solveResult, circuit));
