/**
 * Validator factory functions.
 *
 * Every lesson composes its advancement predicate from these factories.
 * No lesson definition hand-rolls check logic — it only calls these.
 *
 * All predicates return false when solveResult is null (circuit not yet solved).
 */

import type { SolveResult } from '../domain/solve-result';
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
// Combinators
// ---------------------------------------------------------------------------

/** True when ALL predicates pass. */
export const allOf = (...predicates: ValidatorPredicate[]): ValidatorPredicate =>
  (solveResult) => predicates.every((p) => p(solveResult));

/** True when ANY predicate passes. */
export const anyOf = (...predicates: ValidatorPredicate[]): ValidatorPredicate =>
  (solveResult) => predicates.some((p) => p(solveResult));
