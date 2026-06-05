/**
 * Per-component state. Drives both the visual renderer and hint copy.
 *
 * `floating/dangling`           — terminal(s) with no wire attached
 * `floating/isolated-from-source` — wired but no complete path to a battery
 * `active`                      — part of a closed loop; V/I/P are live values
 *
 * This is a pinned contract — Phase 1 (mock) and Phase 2 (real solver)
 * both produce this shape. The UI never needs to change between phases.
 */
export type ComponentState =
  | { status: 'floating'; reason: 'dangling' | 'isolated-from-source' | 'unsolvable' }
  | { status: 'active'; voltage: number; current: number; power: number };

export interface SolveResult {
  /** Keyed by component ID (matches React Flow node id). */
  components: Record<string, ComponentState>;
  /**
   * Node voltages keyed by NodeId.
   * Empty in Phase 1 mock; populated by ohms.ts in Phase 2.
   */
  nodes: Record<string, number>;
}
