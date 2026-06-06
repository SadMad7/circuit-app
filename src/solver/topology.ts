/**
 * CODEX-OWNED — do not implement here. Replaces solver/reachability.ts in Phase 2.
 *
 * Classifies each component in a Circuit as floating (dangling or isolated-from-source)
 * or active (part of a closed loop through a battery). Works on the Circuit domain model
 * produced by converter.ts (union-find NodeIds), not on the React Flow graph directly.
 *
 * ─── Algorithm outline ────────────────────────────────────────────────────
 * 1. Detect dangling components: a component is dangling if any of its terminal NodeIds
 *    appears on exactly one component (i.e., that terminal is not shared with another
 *    component's terminal — no wire was connected to it).
 *    Implementation note: build a frequency map of NodeId → list of (componentId, terminal)
 *    references. A NodeId with only one entry is a dangling terminal.
 *
 * 2. Build a component-level adjacency graph: two components are adjacent if they share
 *    a NodeId (i.e., they are wired together at that node).
 *
 * 3. For each battery in the circuit, run DFS/BFS from the battery's `positive` NodeId,
 *    traversing the component adjacency graph. Mark every component reached as
 *    `reachable-from-source`.
 *
 * 4. A component is `active` if:
 *    (a) it is not dangling, AND
 *    (b) it is reachable from a battery's positive terminal, AND
 *    (c) the battery's negative terminal is also reachable from the component
 *        (i.e., there is a return path — the loop is closed).
 *    Condition (c) can be checked by also running DFS backward from battery.negative
 *    and intersecting the two reachable sets, OR by checking that battery.negative
 *    was visited in the forward DFS from battery.positive (which is true iff the
 *    circuit is closed).
 *
 * 5. A component is `isolated-from-source` if it is not dangling but is not active.
 *
 * ─── Edge cases to handle ─────────────────────────────────────────────────
 * • No battery in circuit: all components → floating/isolated-from-source.
 *
 * • Multiple batteries: NOT supported. If the circuit contains more than one
 *     Battery component, return every component as floating/isolated-from-source
 *     without attempting any DFS. ohms.ts is never called. This covers all lesson
 *     paths (every core lesson uses exactly one battery). Sandbox users who place
 *     two batteries see all values go blank, which is informative and safe.
 *
 * • Wires to nowhere: this concept does not exist in Circuit. The converter absorbs
 *     null-handle edges before Circuit is produced; topology.ts never receives them.
 *     A terminal with no wire appears as a singleton NodeId (handled by dangling
 *     detection below). No special case needed here.
 *
 * • Dangling vs. self-shorted — IMPORTANT DISTINCTION:
 *     A terminal is dangling if its NodeId appears on exactly ONE (componentId, terminal)
 *     pair across the entire frequency map — i.e., nothing else in the circuit
 *     references that node.
 *
 *     A self-shorted component (terminals.a === terminals.b = N, produced by the
 *     converter for self-loop edges or external wires shorting both terminals to the
 *     same node) is NOT dangling: the NodeId N appears on two (componentId, terminal)
 *     pairs — both the 'a' and 'b' entries of that same component. Its frequency map
 *     count is 2, so it is not a singleton, so it is not dangling.
 *
 *     Self-shorted components are classified as active if their shared NodeId lies on
 *     a closed path from battery.positive to battery.negative; otherwise isolated.
 *     ohms.ts handles the 0 Ω arithmetic for the short.
 *
 * • Disconnected subgraphs: components in an island with no battery → isolated-from-source.
 *     Components in an island WITH a battery but no return path → isolated-from-source.
 *
 * • Open switch (Lesson 7, deferred): treat a switch with closed=false as if the wire
 *     between its terminals does not exist — do not add its internal edge to the
 *     adjacency graph. This makes downstream components isolated-from-source.
 *
 * • Circuit with a battery and a direct short (battery.positive NodeId === battery.negative
 *     NodeId via wires): technically a short circuit. Classify all components as active;
 *     ohms.ts is responsible for surfacing the short-circuit error.
 *
 * • Components not referenced by any NodeId (empty components array): return {}.
 *
 * ─── Return shape ─────────────────────────────────────────────────────────
 * Returns only the floating/active classification, NOT V/I/P values.
 * Those are computed by ohms.ts for active components.
 *
 * ─── Not in scope ─────────────────────────────────────────────────────────
 * Numeric solving. This file is topology-only.
 */

import type { Circuit } from '../domain/circuit';
import type { ComponentState } from '../domain/solve-result';

/**
 * Classifies each component in the circuit as floating or active (placeholder values).
 * Active components receive voltage=0/current=0/power=0 — ohms.ts overlays real values.
 *
 * @param circuit  Domain model from convertToCircuit().
 * @returns        Record<componentId, ComponentState> with placeholder active values.
 */
export function classifyTopology(
  circuit: Circuit,
): Record<string, ComponentState> {
  // Codex implements this body.
  void circuit;
  return {};
}
