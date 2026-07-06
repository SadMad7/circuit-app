import type { Edge } from '@xyflow/react';
import type { ComponentKind } from '../domain/component';
import type { SolveResult } from '../domain/solve-result';
import type { Circuit } from '../domain/circuit';
import type { AppNode } from '../canvas/nodes/types';

/**
 * A predicate that decides whether the lesson goal has been met.
 * Receives the current SolveResult (null if canvas is empty or solve hasn't run
 * yet) and the converted Circuit (for validators that read wiring topology —
 * shared terminal NodeIds — rather than solved values, e.g. lesson 5's
 * series/parallel check). Returns true when the goal is satisfied →
 * auto-advance triggers.
 *
 * Lessons compose these from the factory functions in validators.ts.
 * Never hand-roll logic directly in a lesson definition.
 */
export type ValidatorPredicate = (
  solveResult: SolveResult | null,
  circuit: Circuit,
) => boolean;

/**
 * A function that returns the current hint string given the live SolveResult,
 * the current React Flow edges, and the converted Circuit.
 *
 * `edges` is included because SolveResult alone cannot distinguish between
 * "terminal A is dangling because it has no wire" and "terminal A is dangling
 * because the user wired the wrong terminal instead" — both produce the same
 * floating/dangling state. Lessons that need to detect miswiring (e.g. Lesson 1's
 * battery+ → LED cathode wrong-path hint) inspect edges directly.
 *
 * `circuit` is included for hints keyed on wiring topology (lesson 5's
 * series-mistake correction reads shared NodeIds, not solved values).
 *
 * Hint copy should reference component UI labels ("the LED", "the resistor"),
 * not internal component IDs.
 */
export type HintScript = (
  solveResult: SolveResult | null,
  edges: Edge[],
  circuit: Circuit,
) => string;

/**
 * One draggable entry in the palette tray.
 * The lesson owns the component's value (e.g. a 330 Ω resistor); the insert
 * action reads it off the entry being placed. Lesson 3's slider later writes
 * to the same resistanceOhm field — one home for a resistor's value.
 */
export interface PaletteEntry {
  kind: ComponentKind;
  /** Chip label shown in the tray (sentence case), e.g. "330 Ω resistor". */
  label: string;
  /** Resistor-kind entries only. */
  resistanceOhm?: number;
}

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
   * Palette entries offered in this lesson.
   * Empty array = no palette (Lesson 1 — drag-to-wire only).
   */
  palette: PaletteEntry[];
  /**
   * What a palette drop does in this lesson.
   *   'insert' (default) — drop onto a wire splits it and interposes the
   *                        component in series (lessons 2 and 4).
   *   'place'            — drop creates a free, unwired component at the
   *                        cursor; the user wires it by hand (lesson 5's
   *                        branch-wiring gesture). No auto-connect.
   */
  paletteDropMode?: 'insert' | 'place';
  /**
   * Returns the hint string appropriate for the current circuit state.
   * Driven by ComponentState — no bespoke checks, only reads status/reason.
   */
  hint: HintScript;
  /**
   * Returns true when the lesson goal is met → lesson player triggers auto-advance.
   * Omitted when the lesson advances on interaction history instead (sliderGoal).
   */
  advancement?: ValidatorPredicate;
  /**
   * Interaction-history goal (lesson 3): advance once the user has committed
   * the named component's resistance into BOTH zones during the session.
   * This is a different category from `advancement` — it watches user actions
   * over time, not circuit state, so it cannot be a SolveResult-reading
   * validator. The lesson player tracks it in per-lesson memory.
   */
  sliderGoal?: {
    componentId: string;
    /** Low zone: committed resistance <= lowMax (ohms). */
    lowMax: number;
    /** High zone: committed resistance >= highMin (ohms). */
    highMin: number;
  };
}
