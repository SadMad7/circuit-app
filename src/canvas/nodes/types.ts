import type { Node } from '@xyflow/react';
import type { ComponentKind } from '../../domain/component';

/**
 * Data carried on every React Flow node.
 * The `kind` discriminant lets renderers and the solver identify the component type
 * without parsing node IDs.
 *
 * Optional fields are kind-specific:
 *   voltageV      — battery only
 *   resistanceOhm — resistor only
 *   closed        — switch only (bonus lesson 7, deferred)
 */
export type AppNodeData = {
  kind: ComponentKind;
  componentId: string;
  label: string;
  voltageV?: number;
  resistanceOhm?: number;
  closed?: boolean;
};

/** The React Flow node type used throughout the app. */
export type AppNode = Node<AppNodeData, ComponentKind>;
