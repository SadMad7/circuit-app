/**
 * Series/parallel Ohm's law solver for Phase 2.
 *
 * This solver only receives components already classified as active by
 * topology.ts. It never represents open circuits as an OhmsResult reason:
 * topology owns that as isolated-from-source.
 */

import type { Component } from '../domain/component';
import type { Circuit } from '../domain/circuit';
import type { ComponentState } from '../domain/solve-result';

type OhmsFailureReason =
  | 'short-circuit'
  | 'conflicting-sources'
  | 'not-reducible';

export type OhmsResult =
  | {
      ok: true;
      components: Record<string, ComponentState>;
      nodes: Record<string, number>;
    }
  | { ok: false; reason: OhmsFailureReason };

type ReductionTree =
  | {
      kind: 'leaf';
      componentId: string;
      resistance: number;
      from: string;
      to: string;
    }
  | {
      kind: 'series';
      resistance: number;
      from: string;
      to: string;
      sharedNode: string;
      left: ReductionTree;
      right: ReductionTree;
    }
  | {
      kind: 'parallel';
      resistance: number;
      from: string;
      to: string;
      left: ReductionTree;
      right: ReductionTree;
    };

type Branch = {
  resistance: number;
  from: string;
  to: string;
  tree: ReductionTree;
};

const EPSILON = 1e-9;

function activeComponents(circuit: Circuit, activeIds: Set<string>): Component[] {
  return circuit.components.filter((component) => activeIds.has(component.id));
}

function solvedResistance(
  nominalResistance: number,
  from: string,
  to: string,
): number {
  return from === to ? 0 : nominalResistance;
}

function terminalPairFor(component: Component): { from: string; to: string } | null {
  switch (component.kind) {
    case 'battery':
      return null;
    case 'resistor':
    case 'bulb':
    case 'switch':
      return { from: component.terminals.a, to: component.terminals.b };
  }
}

function isBypassedComponent(component: Component): boolean {
  const terminals = terminalPairFor(component);
  return terminals !== null && terminals.from === terminals.to;
}

function zeroState(): ComponentState {
  return {
    status: 'active',
    voltage: 0,
    current: 0,
    power: 0,
  };
}

function branchFor(component: Component): Branch | null {
  switch (component.kind) {
    case 'battery':
      return null;

    case 'resistor': {
      const resistance = solvedResistance(
        component.resistanceOhm,
        component.terminals.a,
        component.terminals.b,
      );

      return {
        resistance,
        from: component.terminals.a,
        to: component.terminals.b,
        tree: {
          kind: 'leaf',
          componentId: component.id,
          resistance,
          from: component.terminals.a,
          to: component.terminals.b,
        },
      };
    }

    case 'bulb': {
      const resistance = solvedResistance(
        component.resistanceOhm,
        component.terminals.a,
        component.terminals.b,
      );

      return {
        resistance,
        from: component.terminals.a,
        to: component.terminals.b,
        tree: {
          kind: 'leaf',
          componentId: component.id,
          resistance,
          from: component.terminals.a,
          to: component.terminals.b,
        },
      };
    }

    case 'switch':
      if (!component.closed) return null;
      return {
        resistance: 0,
        from: component.terminals.a,
        to: component.terminals.b,
        tree: {
          kind: 'leaf',
          componentId: component.id,
          resistance: 0,
          from: component.terminals.a,
          to: component.terminals.b,
        },
      };
  }
}

function sameEndpoints(first: Branch, second: Branch): boolean {
  return (
    (first.from === second.from && first.to === second.to) ||
    (first.from === second.to && first.to === second.from)
  );
}

function branchConnects(branch: Branch, first: string, second: string): boolean {
  return (
    (branch.from === first && branch.to === second) ||
    (branch.from === second && branch.to === first)
  );
}

function treeConnects(tree: ReductionTree, first: string, second: string): boolean {
  return (
    (tree.from === first && tree.to === second) ||
    (tree.from === second && tree.to === first)
  );
}

function otherEndpoint(branch: Branch, nodeId: string): string {
  return branch.from === nodeId ? branch.to : branch.from;
}

function parallelResistance(first: number, second: number): number {
  if (Math.abs(first) <= EPSILON || Math.abs(second) <= EPSILON) return 0;
  return 1 / (1 / first + 1 / second);
}

function replaceTwoBranches(
  branches: Branch[],
  firstIndex: number,
  secondIndex: number,
  replacement: Branch,
): Branch[] {
  return branches
    .filter((_, index) => index !== firstIndex && index !== secondIndex)
    .concat(replacement);
}

function reduceParallelPair(branches: Branch[]): Branch[] | null {
  for (let firstIndex = 0; firstIndex < branches.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < branches.length;
      secondIndex += 1
    ) {
      const first = branches[firstIndex];
      const second = branches[secondIndex];

      if (!sameEndpoints(first, second)) continue;

      const replacement: Branch = {
        resistance: parallelResistance(first.resistance, second.resistance),
        from: first.from,
        to: first.to,
        tree: {
          kind: 'parallel',
          resistance: parallelResistance(first.resistance, second.resistance),
          from: first.from,
          to: first.to,
          left: first.tree,
          right: second.tree,
        },
      };

      return replaceTwoBranches(branches, firstIndex, secondIndex, replacement);
    }
  }

  return null;
}

function buildIncidence(branches: Branch[]): Map<string, Branch[]> {
  const incidence = new Map<string, Branch[]>();

  for (const branch of branches) {
    const fromBranches = incidence.get(branch.from) ?? [];
    fromBranches.push(branch);
    incidence.set(branch.from, fromBranches);

    if (branch.to !== branch.from) {
      const toBranches = incidence.get(branch.to) ?? [];
      toBranches.push(branch);
      incidence.set(branch.to, toBranches);
    }
  }

  return incidence;
}

function reduceSeriesPair(
  branches: Branch[],
  sourceNode: string,
  groundNode: string,
): Branch[] | null {
  const incidence = buildIncidence(branches);

  for (const [nodeId, incidentBranches] of incidence) {
    if (nodeId === sourceNode || nodeId === groundNode) continue;
    if (incidentBranches.length !== 2) continue;

    const [first, second] = incidentBranches;
    if (first === second) continue;

    const firstIndex = branches.indexOf(first);
    const secondIndex = branches.indexOf(second);
    const firstOuter = otherEndpoint(first, nodeId);
    const secondOuter = otherEndpoint(second, nodeId);

    const replacement: Branch = {
      resistance: first.resistance + second.resistance,
      from: firstOuter,
      to: secondOuter,
      tree: {
        kind: 'series',
        resistance: first.resistance + second.resistance,
        from: firstOuter,
        to: secondOuter,
        sharedNode: nodeId,
        left: first.tree,
        right: second.tree,
      },
    };

    return replaceTwoBranches(branches, firstIndex, secondIndex, replacement);
  }

  return null;
}

function reduceNetwork(
  branches: Branch[],
  sourceNode: string,
  groundNode: string,
): Branch | null {
  let remaining = branches;

  while (remaining.length > 1) {
    const parallelReduced = reduceParallelPair(remaining);
    if (parallelReduced) {
      remaining = parallelReduced;
      continue;
    }

    const seriesReduced = reduceSeriesPair(remaining, sourceNode, groundNode);
    if (seriesReduced) {
      remaining = seriesReduced;
      continue;
    }

    return null;
  }

  return remaining[0] ?? null;
}

function orderedSeriesChildren(
  tree: Extract<ReductionTree, { kind: 'series' }>,
  from: string,
  to: string,
): { first: ReductionTree; second: ReductionTree } | null {
  if (
    treeConnects(tree.left, from, tree.sharedNode) &&
    treeConnects(tree.right, tree.sharedNode, to)
  ) {
    return { first: tree.left, second: tree.right };
  }

  if (
    treeConnects(tree.right, from, tree.sharedNode) &&
    treeConnects(tree.left, tree.sharedNode, to)
  ) {
    return { first: tree.right, second: tree.left };
  }

  return null;
}

function childCurrentForParallel(
  child: ReductionTree,
  sibling: ReductionTree,
  parentCurrent: number,
  voltageDifference: number,
): number {
  const childIsShort = Math.abs(child.resistance) <= EPSILON;
  const siblingIsShort = Math.abs(sibling.resistance) <= EPSILON;

  if (childIsShort && siblingIsShort) return parentCurrent / 2;
  if (childIsShort) return parentCurrent;
  if (siblingIsShort) return 0;
  return voltageDifference / child.resistance;
}

function assignTreeValues(
  tree: ReductionTree,
  from: string,
  to: string,
  fromVoltage: number,
  toVoltage: number,
  current: number,
  componentStates: Record<string, ComponentState>,
  nodeVoltages: Record<string, number>,
): boolean {
  nodeVoltages[from] = fromVoltage;
  nodeVoltages[to] = toVoltage;

  switch (tree.kind) {
    case 'leaf': {
      componentStates[tree.componentId] = {
        status: 'active',
        voltage: Math.abs(fromVoltage - toVoltage),
        current: Math.abs(current),
        power: Math.abs(fromVoltage - toVoltage) * Math.abs(current),
      };
      return true;
    }

    case 'series': {
      const orderedChildren = orderedSeriesChildren(tree, from, to);
      if (!orderedChildren) return false;

      const { first, second } = orderedChildren;
      const voltageDifference = fromVoltage - toVoltage;
      const firstRatio =
        Math.abs(tree.resistance) <= EPSILON
          ? 0
          : first.resistance / tree.resistance;
      const sharedVoltage = fromVoltage - voltageDifference * firstRatio;

      nodeVoltages[tree.sharedNode] = sharedVoltage;

      return (
        assignTreeValues(
          first,
          from,
          tree.sharedNode,
          fromVoltage,
          sharedVoltage,
          current,
          componentStates,
          nodeVoltages,
        ) &&
        assignTreeValues(
          second,
          tree.sharedNode,
          to,
          sharedVoltage,
          toVoltage,
          current,
          componentStates,
          nodeVoltages,
        )
      );
    }

    case 'parallel': {
      if (
        !treeConnects(tree.left, from, to) ||
        !treeConnects(tree.right, from, to)
      ) {
        return false;
      }

      const voltageDifference = fromVoltage - toVoltage;
      const leftCurrent = childCurrentForParallel(
        tree.left,
        tree.right,
        current,
        voltageDifference,
      );
      const rightCurrent = childCurrentForParallel(
        tree.right,
        tree.left,
        current,
        voltageDifference,
      );

      return (
        assignTreeValues(
          tree.left,
          from,
          to,
          fromVoltage,
          toVoltage,
          leftCurrent,
          componentStates,
          nodeVoltages,
        ) &&
        assignTreeValues(
          tree.right,
          from,
          to,
          fromVoltage,
          toVoltage,
          rightCurrent,
          componentStates,
          nodeVoltages,
        )
      );
    }
  }
}

/**
 * Solves V/I/P for active components via series/parallel reduction.
 */
export function solveOhms(
  circuit: Circuit,
  activeIds: Set<string>,
): OhmsResult {
  if (activeIds.size === 0) {
    return { ok: true, components: {}, nodes: {} };
  }

  const active = activeComponents(circuit, activeIds);
  const batteries = active.filter((component) => component.kind === 'battery');

  if (batteries.length > 1) {
    return { ok: false, reason: 'conflicting-sources' };
  }

  if (batteries.length !== 1) {
    return { ok: false, reason: 'not-reducible' };
  }

  const battery = batteries[0];
  const sourceNode = battery.terminals.positive;
  const groundNode = battery.terminals.negative;

  if (sourceNode === groundNode) {
    return { ok: false, reason: 'short-circuit' };
  }

  const components: Record<string, ComponentState> = Object.fromEntries(
    active
      .filter(isBypassedComponent)
      .map((component) => [component.id, zeroState()]),
  );

  const branches = active
    .filter((component) => !isBypassedComponent(component))
    .map((component) => branchFor(component))
    .filter((branch): branch is Branch => branch !== null);

  const reduced = reduceNetwork(branches, sourceNode, groundNode);
  if (!reduced) {
    return { ok: false, reason: 'not-reducible' };
  }

  if (!branchConnects(reduced, sourceNode, groundNode)) {
    return { ok: false, reason: 'not-reducible' };
  }

  if (Math.abs(reduced.resistance) <= EPSILON) {
    return { ok: false, reason: 'short-circuit' };
  }

  const totalCurrent = battery.voltageV / reduced.resistance;
  components[battery.id] = {
    status: 'active',
    voltage: Math.abs(battery.voltageV),
    current: Math.abs(totalCurrent),
    power: Math.abs(battery.voltageV) * Math.abs(totalCurrent),
  };

  const nodes: Record<string, number> = {
    [groundNode]: 0,
    [sourceNode]: battery.voltageV,
  };

  const assigned = assignTreeValues(
    reduced.tree,
    sourceNode,
    groundNode,
    battery.voltageV,
    0,
    totalCurrent,
    components,
    nodes,
  );

  if (!assigned) {
    return { ok: false, reason: 'not-reducible' };
  }

  for (const componentId of activeIds) {
    if (!components[componentId]) {
      return { ok: false, reason: 'not-reducible' };
    }
  }

  return { ok: true, components, nodes };
}
