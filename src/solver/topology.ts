/**
 * Topology classification for Phase 2.
 *
 * This file decides whether each component is dangling, isolated from a source,
 * or part of a closed battery loop. It does not compute numeric values.
 */

import type { Component } from '../domain/component';
import type { Circuit } from '../domain/circuit';
import type { ComponentState } from '../domain/solve-result';

type TerminalRef = {
  componentId: string;
  nodeId: string;
};

type ConductiveEdge = {
  componentId: string;
  from: string;
  to: string;
};

const activePlaceholder: ComponentState = {
  status: 'active',
  voltage: 0,
  current: 0,
  power: 0,
};

function floating(reason: 'dangling' | 'isolated-from-source'): ComponentState {
  return { status: 'floating', reason };
}

function terminalNodeIds(component: Component): string[] {
  switch (component.kind) {
    case 'battery':
      return [component.terminals.positive, component.terminals.negative];
    case 'resistor':
    case 'bulb':
    case 'switch':
      return [component.terminals.a, component.terminals.b];
  }
}

function conductiveEdgeFor(component: Component): ConductiveEdge | null {
  switch (component.kind) {
    case 'battery':
      return null;
    case 'switch':
      if (!component.closed) return null;
      return {
        componentId: component.id,
        from: component.terminals.a,
        to: component.terminals.b,
      };
    case 'resistor':
    case 'bulb':
      return {
        componentId: component.id,
        from: component.terminals.a,
        to: component.terminals.b,
      };
  }
}

function buildTerminalRefs(components: Component[]): Map<string, TerminalRef[]> {
  const refsByNode = new Map<string, TerminalRef[]>();

  for (const component of components) {
    for (const nodeId of terminalNodeIds(component)) {
      const refs = refsByNode.get(nodeId) ?? [];
      refs.push({ componentId: component.id, nodeId });
      refsByNode.set(nodeId, refs);
    }
  }

  return refsByNode;
}

function isDangling(
  component: Component,
  refsByNode: Map<string, TerminalRef[]>,
): boolean {
  return terminalNodeIds(component).some((nodeId) => {
    const refs = refsByNode.get(nodeId);
    return refs === undefined || refs.length === 1;
  });
}

function addAdjacency(
  adjacency: Map<string, ConductiveEdge[]>,
  edge: ConductiveEdge,
) {
  const fromEdges = adjacency.get(edge.from) ?? [];
  fromEdges.push(edge);
  adjacency.set(edge.from, fromEdges);

  const toEdges = adjacency.get(edge.to) ?? [];
  toEdges.push(edge);
  adjacency.set(edge.to, toEdges);
}

function otherNode(edge: ConductiveEdge, nodeId: string): string {
  return edge.from === nodeId ? edge.to : edge.from;
}

function walkFrom(
  startNodeId: string,
  adjacency: Map<string, ConductiveEdge[]>,
): { nodes: Set<string>; components: Set<string> } {
  const nodes = new Set<string>([startNodeId]);
  const components = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (nodeId === undefined) continue;

    for (const edge of adjacency.get(nodeId) ?? []) {
      components.add(edge.componentId);

      const nextNodeId = otherNode(edge, nodeId);
      if (!nodes.has(nextNodeId)) {
        nodes.add(nextNodeId);
        queue.push(nextNodeId);
      }
    }
  }

  return { nodes, components };
}

/**
 * Classifies each component in the circuit as floating or active.
 *
 * Active components receive placeholder numeric values. ohms.ts overlays real
 * voltage, current, and power after topology proves the loop is closed.
 */
export function classifyTopology(
  circuit: Circuit,
): Record<string, ComponentState> {
  const components = circuit.components;
  if (components.length === 0) return {};

  const refsByNode = buildTerminalRefs(components);
  const danglingIds = new Set(
    components
      .filter((component) => isDangling(component, refsByNode))
      .map((component) => component.id),
  );

  const batteries = components.filter((component) => component.kind === 'battery');
  if (batteries.length > 1) {
    return Object.fromEntries(
      components.map((component) => [
        component.id,
        floating('isolated-from-source'),
      ]),
    );
  }

  if (batteries.length === 0) {
    return Object.fromEntries(
      components.map((component) => [
        component.id,
        floating('isolated-from-source'),
      ]),
    );
  }

  const battery = batteries[0];
  const adjacency = new Map<string, ConductiveEdge[]>();

  for (const component of components) {
    if (danglingIds.has(component.id)) continue;

    const edge = conductiveEdgeFor(component);
    if (edge) addAdjacency(adjacency, edge);
  }

  const walk = walkFrom(battery.terminals.positive, adjacency);
  const loopIsClosed =
    battery.terminals.positive === battery.terminals.negative ||
    walk.nodes.has(battery.terminals.negative);

  if (!loopIsClosed) {
    return Object.fromEntries(
      components.map((component) => [
        component.id,
        danglingIds.has(component.id)
          ? floating('dangling')
          : floating('isolated-from-source'),
      ]),
    );
  }

  return Object.fromEntries(
    components.map((component) => {
      if (danglingIds.has(component.id)) {
        return [component.id, floating('dangling')];
      }

      const isActive =
        component.id === battery.id || walk.components.has(component.id);

      return [
        component.id,
        isActive ? activePlaceholder : floating('isolated-from-source'),
      ];
    }),
  );
}
