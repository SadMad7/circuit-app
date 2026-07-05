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
import type { Lesson } from '../lessons/types';
import { solve } from '../solver/index';
import { convertToCircuit } from '../canvas/converter';
import { loadProgress, saveProgress } from '../persistence/storage';

// ---------------------------------------------------------------------------
// Lesson registry — imported lazily to avoid circular deps
// ---------------------------------------------------------------------------
import { lesson01 } from '../lessons/definitions/lesson-01-complete-loop';

const LESSONS: Lesson[] = [lesson01];

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

  // Actions
  loadLesson: (lessonId: string) => void;
  completeCurrentLesson: () => void;
  triggerSolve: () => void;
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
