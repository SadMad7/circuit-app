import type { Edge } from '@xyflow/react';
import type { ComponentKind } from '../domain/component';
import type { SolveResult } from '../domain/solve-result';
import type { AppNode } from '../canvas/nodes/types';

/**
 * A predicate that decides whether the lesson goal has been met.
 * Receives the current SolveResult (null if canvas is empty or solve hasn't run yet).
 * Returns true when the goal is satisfied → auto-advance triggers.
 *
 * Lessons compose these from the factory functions in validators.ts.
 * Never hand-roll logic directly in a lesson definition.
 */
export type ValidatorPredicate = (solveResult: SolveResult | null) => boolean;

/**
 * A function that returns the current hint string given the live SolveResult
 * and the current React Flow edges.
 *
 * `edges` is included because SolveResult alone cannot distinguish between
 * "terminal A is dangling because it has no wire" and "terminal A is dangling
 * because the user wired the wrong terminal instead" — both produce the same
 * floating/dangling state. Lessons that need to detect miswiring (e.g. Lesson 1's
 * battery+ → LED cathode wrong-path hint) inspect edges directly.
 *
 * Hint copy should reference component UI labels ("the LED", "the resistor"),
 * not internal component IDs.
 */
export type HintScript = (solveResult: SolveResult | null, edges: Edge[]) => string;

/** A single lesson definition — data only, no logic. */
export interface Lesson {
  id: string;
  /** Short title shown in progress header (sentence case). */
  title: string;
  /** One-line concept summary shown below the title. */
  concept: string;
  /** Initial React Flow state loaded when the lesson activates. */
  initialCanvas: {
    nodes: AppNode[];
    edges: Edge[];
  };
  /**
   * Component kinds the palette should offer in this lesson.
   * Empty array = no palette (Lesson 1 — drag-to-wire only).
   */
  availablePaletteKinds: ComponentKind[];
  /**
   * Returns the hint string appropriate for the current circuit state.
   * Driven by ComponentState — no bespoke checks, only reads status/reason.
   */
  hint: HintScript;
  /** Returns true when the lesson goal is met → lesson player triggers auto-advance. */
  advancement: ValidatorPredicate;
}
