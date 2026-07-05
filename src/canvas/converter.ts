/**
 * Converts React Flow component nodes and wire edges into the Circuit domain
 * model. Wires do not survive this boundary directly; they are represented by
 * shared NodeId strings on component terminals.
 *
 * Converter responsibilities:
 * - create one union-find entry for every expected terminal handle
 * - union valid wire endpoints that connect two known handles
 * - skip null, stale, or unknown edge endpoints without throwing
 * - emit domain components with terminal NodeIds produced by the union-find roots
 *
 * Numeric component values are copied from node.data, with the same defaults the
 * current UI/mock solver uses when a field is absent.
 */

import type { Edge, Node } from '@xyflow/react';
import type { AppNodeData } from './nodes/types';
import type { Circuit } from '../domain/circuit';
import type { Component } from '../domain/component';

const TERMINALS_BY_KIND = {
  battery: ['positive', 'negative'],
  resistor: ['a', 'b'],
  bulb: ['a', 'b'],
  switch: ['a', 'b'],
} as const;

type TerminalName =
  (typeof TERMINALS_BY_KIND)[keyof typeof TERMINALS_BY_KIND][number];

function toHandleId(nodeId: string, terminal: TerminalName): string {
  return `${nodeId}__${terminal}`;
}

function handleBelongsToNode(nodeId: string, handleId: string): boolean {
  return handleId.startsWith(`${nodeId}__`);
}

/**
 * Converts the React Flow graph into a Circuit domain model via union-find.
 *
 * @param nodes Current React Flow nodes.
 * @param edges Current React Flow edges.
 * @returns Circuit whose component terminals share NodeIds wherever wired together.
 */
export function convertToCircuit(nodes: Node<AppNodeData>[], edges: Edge[]): Circuit {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const parents = new Map<string, string>();

  const find = (handleId: string): string => {
    const parent = parents.get(handleId);

    if (parent === undefined) {
      parents.set(handleId, handleId);
      return handleId;
    }

    if (parent === handleId) return handleId;

    const root = find(parent);
    parents.set(handleId, root);
    return root;
  };

  const union = (firstHandleId: string, secondHandleId: string) => {
    const firstRoot = find(firstHandleId);
    const secondRoot = find(secondHandleId);

    if (firstRoot !== secondRoot) {
      parents.set(secondRoot, firstRoot);
    }
  };

  for (const node of nodes) {
    for (const terminal of TERMINALS_BY_KIND[node.data.kind]) {
      const handleId = toHandleId(node.id, terminal);
      parents.set(handleId, handleId);
    }
  }

  for (const edge of edges) {
    if (!edge.sourceHandle || !edge.targetHandle) continue;
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (!handleBelongsToNode(edge.source, edge.sourceHandle)) continue;
    if (!handleBelongsToNode(edge.target, edge.targetHandle)) continue;
    if (!parents.has(edge.sourceHandle) || !parents.has(edge.targetHandle)) continue;

    union(edge.sourceHandle, edge.targetHandle);
  }

  const nodeIdFor = (nodeId: string, terminal: TerminalName) =>
    find(toHandleId(nodeId, terminal));

  const components: Component[] = nodes.map((node) => {
    const { data } = node;
    const id = data.componentId;

    switch (data.kind) {
      case 'battery':
        return {
          kind: 'battery',
          id,
          voltageV: data.voltageV ?? 9,
          terminals: {
            positive: nodeIdFor(node.id, 'positive'),
            negative: nodeIdFor(node.id, 'negative'),
          },
        };

      case 'resistor':
        return {
          kind: 'resistor',
          id,
          resistanceOhm: data.resistanceOhm ?? 330,
          terminals: {
            a: nodeIdFor(node.id, 'a'),
            b: nodeIdFor(node.id, 'b'),
          },
        };

      case 'bulb':
        return {
          kind: 'bulb',
          id,
          resistanceOhm: data.resistanceOhm ?? 18,
          terminals: {
            a: nodeIdFor(node.id, 'a'),
            b: nodeIdFor(node.id, 'b'),
          },
        };

      case 'switch':
        return {
          kind: 'switch',
          id,
          closed: data.closed ?? true,
          terminals: {
            a: nodeIdFor(node.id, 'a'),
            b: nodeIdFor(node.id, 'b'),
          },
        };
    }
  });

  return { components };
}
