/**
 * Phase 1 only — throwaway implementation. Deleted when Codex delivers topology.ts in Phase 2.
 *
 * Classifies each React Flow node as:
 *   floating/dangling           — terminal handle(s) with no wire connected
 *   floating/isolated-from-source — all handles wired but no closed loop through a battery
 *   active (placeholder)        — part of a closed loop (V/I/P = 0; mock-fixtures.ts overlays real values)
 *
 * Works directly on React Flow nodes + edges so we don't depend on converter.ts (Codex stub).
 *
 * Handle ID convention (set in each custom node renderer):
 *   `${nodeId}__positive`   battery positive terminal
 *   `${nodeId}__negative`   battery negative terminal
 *   `${nodeId}__a`          two-terminal component, leg a
 *   `${nodeId}__b`          two-terminal component, leg b
 */

import type { Edge } from '@xyflow/react';
import type { AppNode } from '../canvas/nodes/types';
import type { ComponentState } from '../domain/solve-result';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the set of handle IDs for a given node based on its component kind. */
function handlesForNode(node: AppNode): string[] {
  const id = node.id;
  if (node.data.kind === 'battery') {
    return [`${id}__positive`, `${id}__negative`];
  }
  return [`${id}__a`, `${id}__b`];
}

/**
 * Extracts the node ID from a handle ID.
 * Handle format: `${nodeId}__${terminal}` — the node ID cannot contain `__`.
 */
function nodeIdFromHandle(handleId: string): string {
  return handleId.split('__')[0];
}

/** Builds a bidirectional adjacency map: handleId → set of connected handleIds via wires. */
function buildWireAdjacency(edges: Edge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const edge of edges) {
    if (edge.sourceHandle && edge.targetHandle) {
      link(edge.sourceHandle, edge.targetHandle);
    }
  }
  return adj;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Classifies each node's component state.
 * Active components get V=0/I=0/P=0 as placeholders — mock-fixtures.ts overlays real values
 * for recognised circuit shapes before SolveResult is returned to the UI.
 */
export function classifyComponents(
  nodes: AppNode[],
  edges: Edge[],
): Record<string, ComponentState> {
  const wireAdj = buildWireAdjacency(edges);

  // Map every handle to the node that owns it
  const handleToNodeId: Record<string, string> = {};
  // Map every nodeId to its handle IDs
  const nodeHandles: Record<string, string[]> = {};

  for (const node of nodes) {
    const handles = handlesForNode(node);
    nodeHandles[node.id] = handles;
    for (const h of handles) handleToNodeId[h] = node.id;
  }

  // Set of handles that have at least one wire connected
  const connectedHandles = new Set<string>();
  for (const edge of edges) {
    if (edge.sourceHandle) connectedHandles.add(edge.sourceHandle);
    if (edge.targetHandle) connectedHandles.add(edge.targetHandle);
  }

  // Find the battery — required for reachability
  const batteryNode = nodes.find((n) => n.data.kind === 'battery');

  // If there is no battery, everything is dangling or isolated — classify simply
  if (!batteryNode) {
    return Object.fromEntries(
      nodes.map((n) => {
        const hasDangling = (nodeHandles[n.id] ?? []).some(
          (h) => !connectedHandles.has(h),
        );
        const state: ComponentState = {
          status: 'floating',
          reason: hasDangling ? 'dangling' : 'isolated-from-source',
        };
        return [n.id, state];
      }),
    );
  }

  const startHandle = `${batteryNode.id}__positive`;
  const endHandle   = `${batteryNode.id}__negative`;

  // DFS from battery positive through the wire + component graph.
  // When we visit a handle, we also queue every other handle on the same component
  // (current flows through a component from one terminal to the other).
  const visitedHandles = new Set<string>();
  const visitedNodeIds = new Set<string>();

  const stack: string[] = [startHandle];
  while (stack.length > 0) {
    const handle = stack.pop()!;
    if (visitedHandles.has(handle)) continue;
    visitedHandles.add(handle);

    const nid = handleToNodeId[handle] ?? nodeIdFromHandle(handle);
    if (nid && !visitedNodeIds.has(nid)) {
      visitedNodeIds.add(nid);
      // Traverse to sibling handles on the same component
      for (const sibling of nodeHandles[nid] ?? []) {
        if (!visitedHandles.has(sibling)) stack.push(sibling);
      }
    }

    // Traverse wires
    for (const neighbor of wireAdj.get(handle) ?? []) {
      if (!visitedHandles.has(neighbor)) stack.push(neighbor);
    }
  }

  const circuitClosed = visitedHandles.has(endHandle);

  // Build per-component result
  const result: Record<string, ComponentState> = {};
  for (const node of nodes) {
    const handles = nodeHandles[node.id] ?? [];

    // Dangling: any terminal has no wire
    if (handles.some((h) => !connectedHandles.has(h))) {
      result[node.id] = { status: 'floating', reason: 'dangling' };
      continue;
    }

    // Active: circuit closed and this component was visited in the DFS
    if (circuitClosed && visitedNodeIds.has(node.id)) {
      result[node.id] = { status: 'active', voltage: 0, current: 0, power: 0 };
      continue;
    }

    // Wired but not part of the closed loop
    result[node.id] = { status: 'floating', reason: 'isolated-from-source' };
  }

  return result;
}
