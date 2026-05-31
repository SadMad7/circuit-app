import type { Component } from './component';

/**
 * The domain model produced by `canvas/converter.ts`.
 *
 * Each component's terminal values are NodeId strings that have been merged
 * via union-find: terminals joined by a wire share the same NodeId.
 * Wires themselves do not appear here — they are implicit in the shared NodeIds.
 *
 * This is the input type for `solver/index.ts` in Phase 2.
 * In Phase 1, the solver works from React Flow data directly (see reachability.ts).
 */
export interface Circuit {
  components: Component[];
}
