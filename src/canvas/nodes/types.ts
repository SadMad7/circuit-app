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
 *   slider        — resistor only; present ONLY when the lesson enables a
 *                   resistance slider (lesson 3). Not an intrinsic resistor
 *                   property — resistors without it render no slider.
 */
export type AppNodeData = {
  kind: ComponentKind;
  componentId: string;
  label: string;
  voltageV?: number;
  resistanceOhm?: number;
  closed?: boolean;
  slider?: { min: number; max: number };
};

/** The React Flow node type used throughout the app. */
export type AppNode = Node<AppNodeData, ComponentKind>;
