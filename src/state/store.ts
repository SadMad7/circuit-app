/**
 * Zustand store — single source of truth for the whole app.
 *
 * Holds:
 *   • React Flow nodes + edges (the canvas state)
 *   • Latest SolveResult (updated on every connect/disconnect)
 *   • Lesson progression (currentLessonId, completed map, sandboxUnlocked)
 *
 * The store is NOT the Circuit domain model — it holds React Flow types.
 * solver/index.ts bridges the two.
 */

import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
} from '@xyflow/react';
import type { AppNode } from '../canvas/nodes/types';
import type { SolveResult } from '../domain/solve-result';
import type { Lesson, PaletteEntry } from '../lessons/types';
import { solve } from '../solver/index';
import { convertToCircuit } from '../canvas/converter';
import { loadProgress, saveProgress } from '../persistence/storage';

// ---------------------------------------------------------------------------
// Lesson registry — imported lazily to avoid circular deps
// ---------------------------------------------------------------------------
import { lesson01 } from '../lessons/definitions/lesson-01-complete-loop';
import { lesson02 } from '../lessons/definitions/lesson-02-resistor';
import { lesson03 } from '../lessons/definitions/lesson-03-ohms-law';
import { lesson04 } from '../lessons/definitions/lesson-04-series';
import { lesson05 } from '../lessons/definitions/lesson-05-parallel';

const LESSONS: Lesson[] = [lesson01, lesson02, lesson03, lesson04, lesson05];

/**
 * Deterministic next-index resistor id: lesson 2's first insert is
 * resistor-1; lesson 4 (and lesson 5's placed branch resistor) get the next
 * free index in circuits that already have one.
 */
function nextResistorId(nodes: AppNode[]): string {
  const nextIndex =
    nodes.reduce((max, n) => {
      const m = /^resistor-(\d+)$/.exec(n.id);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0) + 1;
  return `resistor-${nextIndex}`;
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface AppState {
  // React Flow
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;

  // Solver
  solveResult: SolveResult | null;

  // Lesson progression
  currentLessonId: string;
  completedLessons: Record<string, boolean>;
  sandboxUnlocked: boolean;

  /** What a palette drop does in the current lesson (set by loadLesson). */
  paletteDropMode: 'insert' | 'place';

  // Actions
  loadLesson: (lessonId: string) => void;
  completeCurrentLesson: () => void;
  triggerSolve: () => void;
  insertComponentOnEdge: (edgeId: string, entry: PaletteEntry) => void;
  addComponent: (entry: PaletteEntry, position: { x: number; y: number }) => void;
  setResistance: (componentId: string, ohm: number) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>((set, get) => {
  const persisted = loadProgress();

  /** Run the solver against current nodes/edges and update solveResult. */
  const runSolve = (nodes: AppNode[], edges: Edge[]): SolveResult => {
    return solve(convertToCircuit(nodes, edges));
  };

  return {
    // ── Initial React Flow state ─────────────────────────────────────────
    nodes: [],
    edges: [],
    solveResult: null,

    // ── Lesson progression ───────────────────────────────────────────────
    currentLessonId: persisted.currentLessonId ?? 'lesson-01-complete-loop',
    completedLessons: persisted.completedLessons ?? {},
    sandboxUnlocked: persisted.sandboxUnlocked ?? false,
    paletteDropMode: 'insert',

    // ── React Flow handlers ──────────────────────────────────────────────

    onNodesChange: (changes) => {
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
      }));
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const newEdges = applyEdgeChanges(changes, state.edges);
        const solveResult = runSolve(state.nodes, newEdges);
        return { edges: newEdges, solveResult };
      });
    },

    onConnect: (connection: Connection) => {
      set((state) => {
        const newEdges = addEdge(
          { ...connection, type: 'wire', animated: false },
          state.edges,
        );
        const solveResult = runSolve(state.nodes, newEdges);
        return { edges: newEdges, solveResult };
      });
    },

    // ── Actions ──────────────────────────────────────────────────────────

    triggerSolve: () => {
      set((state) => ({
        solveResult: runSolve(state.nodes, state.edges),
      }));
    },

    /**
     * Place mode — create a free, unwired component at the drop position.
     *
     * Lesson 5's branch-wiring gesture: the user places the resistor, then
     * draws its wires by hand (no auto-connect). The re-solve marks the new
     * component dangling so the panel stays truthful.
     */
    addComponent: (entry: PaletteEntry, position: { x: number; y: number }) => {
      set((state) => {
        // Resistor is the only placeable kind today (same guard as insert).
        if (entry.kind !== 'resistor') return {};

        const id = nextResistorId(state.nodes);
        const newNode: AppNode = {
          id,
          type: 'resistor',
          position,
          data: {
            kind: 'resistor',
            componentId: id,
            label: entry.label,
            resistanceOhm: entry.resistanceOhm,
          },
        };

        const nodes = [...state.nodes, newNode];
        return { nodes, solveResult: runSolve(nodes, state.edges) };
      });
    },

    /**
     * Commits a new resistance value for one component and re-solves.
     *
     * Called on slider RELEASE (lesson 3) — never during the drag. A
     * resistance change is just new node data flowing through the normal
     * convertToCircuit → solve path; there is no separate "param solve".
     */
    setResistance: (componentId: string, ohm: number) => {
      set((state) => {
        const nodes = state.nodes.map((n) =>
          n.id === componentId
            ? { ...n, data: { ...n.data, resistanceOhm: ohm } }
            : n,
        );
        return { nodes, solveResult: runSolve(nodes, state.edges) };
      });
    },

    /**
     * Series insertion — split an existing wire around a new component.
     *
     * The wire A→B becomes A→component.a and component.b→B; in the domain model
     * that yields two nodes with the component between them: series. The action
     * is deliberately dumb — the lesson supplies the component's value via the
     * palette entry; nothing here is lesson-aware. One discrete solve on drop.
     */
    insertComponentOnEdge: (edgeId: string, entry: PaletteEntry) => {
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        // Only two-terminal palette components insert in series; batteries never
        // appear in a palette, so resistor is the only droppable kind today.
        if (!edge || entry.kind !== 'resistor') return {};

        const id = nextResistorId(state.nodes);

        // Cosmetic placement: midpoint of the two endpoint nodes.
        const sourceNode = state.nodes.find((n) => n.id === edge.source);
        const targetNode = state.nodes.find((n) => n.id === edge.target);
        const position = {
          x: ((sourceNode?.position.x ?? 0) + (targetNode?.position.x ?? 0)) / 2,
          y: ((sourceNode?.position.y ?? 0) + (targetNode?.position.y ?? 0)) / 2 - 40,
        };

        const newNode: AppNode = {
          id,
          type: 'resistor',
          position,
          data: {
            kind: 'resistor',
            componentId: id,
            label: entry.label,
            resistanceOhm: entry.resistanceOhm,
          },
        };

        // Replace A→B with A→resistor.a and resistor.b→B, preserving the
        // original wire's orientation.
        const newEdges: Edge[] = [
          ...state.edges.filter((e) => e.id !== edgeId),
          {
            id: `${edgeId}-split-a`,
            source: edge.source,
            sourceHandle: edge.sourceHandle,
            target: id,
            targetHandle: `${id}__a`,
            type: 'wire',
          },
          {
            id: `${edgeId}-split-b`,
            source: id,
            sourceHandle: `${id}__b`,
            target: edge.target,
            targetHandle: edge.targetHandle,
            type: 'wire',
          },
        ];

        const newNodes = [...state.nodes, newNode];
        return {
          nodes: newNodes,
          edges: newEdges,
          solveResult: runSolve(newNodes, newEdges),
        };
      });
    },

    loadLesson: (lessonId: string) => {
      const lesson = LESSONS.find((l) => l.id === lessonId);
      if (!lesson) {
        console.warn(`[store] Unknown lesson id: ${lessonId}`);
        return;
      }
      const solveResult = runSolve(
        lesson.initialCanvas.nodes,
        lesson.initialCanvas.edges,
      );
      set({
        nodes: lesson.initialCanvas.nodes,
        edges: lesson.initialCanvas.edges,
        solveResult,
        currentLessonId: lessonId,
        paletteDropMode: lesson.paletteDropMode ?? 'insert',
      });
    },

    completeCurrentLesson: () => {
      const { currentLessonId, completedLessons } = get();
      const updated = { ...completedLessons, [currentLessonId]: true };

      // Check sandbox unlock (after lesson 5)
      const coreIds = LESSONS.map((l) => l.id);
      const sandboxUnlocked = coreIds.every((id) => updated[id]);

      // Advance to next lesson
      const idx = LESSONS.findIndex((l) => l.id === currentLessonId);
      const nextLesson = LESSONS[idx + 1];

      saveProgress({
        currentLessonId: nextLesson?.id ?? currentLessonId,
        completedLessons: updated,
        sandboxUnlocked,
      });

      set({ completedLessons: updated, sandboxUnlocked });

      if (nextLesson) {
        get().loadLesson(nextLesson.id);
      }
    },
  };
});
