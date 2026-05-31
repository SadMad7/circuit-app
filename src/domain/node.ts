/**
 * A shared node identifier.
 * In the domain model (Circuit), two terminals that are wired together
 * share the same NodeId — produced by union-find in canvas/converter.ts.
 * Node IDs are ephemeral implementation details; lessons must never reference them.
 */
export type NodeId = string;

/**
 * A stable reference to a specific terminal on a component.
 * Lessons and validators use TerminalRef instead of raw NodeIds so they
 * remain valid across re-solves (NodeIds may change; componentId + terminal never does).
 */
export type TerminalRef = {
  componentId: string;
  terminal: 'a' | 'b' | 'positive' | 'negative';
};
