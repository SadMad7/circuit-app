/**
 * Lesson player — drives hint text and auto-advance.
 *
 * Subscribes to solveResult via the store. On every change:
 *   1. Calls lesson.hint(solveResult) → renders hint string.
 *   2. Calls lesson.advancement(solveResult) → if true, calls store.completeCurrentLesson().
 *
 * Auto-advance has a 1.5 s delay after goal-met so the user can see the success state
 * before the canvas switches to the next lesson.
 *
 * The player is a pure display component — it holds no circuit logic of its own.
 * All decisions go through the validator factory functions in validators.ts.
 */

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../state/store';

// Lesson registry — Phase 3 adds the rest
import { lesson01 } from './definitions/lesson-01-complete-loop';
import { lesson02 } from './definitions/lesson-02-resistor';
import type { Lesson } from './types';

const LESSONS_MAP: Record<string, Lesson> = {
  [lesson01.id]: lesson01,
  [lesson02.id]: lesson02,
};

// Delay between goal-met and actual advance (ms)
const ADVANCE_DELAY = 1800;

export function LessonPlayer() {
  const solveResult        = useAppStore((s) => s.solveResult);
  const edges              = useAppStore((s) => s.edges);
  const currentLessonId    = useAppStore((s) => s.currentLessonId);
  const completedLessons   = useAppStore((s) => s.completedLessons);
  const completeCurrentLesson = useAppStore((s) => s.completeCurrentLesson);
  const loadLesson         = useAppStore((s) => s.loadLesson);

  const lesson = LESSONS_MAP[currentLessonId];

  const [goalMet, setGoalMet] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kick off the first lesson on mount if nothing is loaded yet
  const nodes = useAppStore((s) => s.nodes);
  useEffect(() => {
    if (nodes.length === 0 && lesson) {
      loadLesson(currentLessonId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check advancement on every solveResult change
  useEffect(() => {
    if (!lesson) return;

    const met = lesson.advancement(solveResult);

    if (met && !goalMet) {
      setGoalMet(true);
      advanceTimer.current = setTimeout(() => {
        completeCurrentLesson();
        setGoalMet(false);
      }, ADVANCE_DELAY);
    }

    if (!met && goalMet) {
      // User broke the circuit after meeting the goal — cancel advance
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setGoalMet(false);
    }

    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [solveResult, lesson, goalMet, completeCurrentLesson]);

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
        No lesson loaded.
      </div>
    );
  }

  const isCompleted = completedLessons[lesson.id];
  const hint = lesson.hint(solveResult, edges);

  return (
    <div className="flex flex-col justify-center gap-1 h-full px-4">
      {/* Lesson title + concept */}
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
          Lesson {currentLessonId.match(/\d+/)?.[0] ?? '?'}
        </span>
        <h1 className="text-base font-bold text-slate-800 leading-tight">
          {lesson.title}
        </h1>
        {isCompleted && (
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
            ✓ done
          </span>
        )}
      </div>

      {/* Concept line */}
      <p className="text-xs text-slate-500 leading-snug">{lesson.concept}</p>

      {/* Hint / feedback */}
      <div
        className={[
          'mt-1 px-3 py-2 rounded-lg text-sm font-medium leading-snug transition-all duration-300',
          goalMet
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-indigo-50 text-indigo-700 border border-indigo-100',
        ].join(' ')}
      >
        {goalMet ? '🎉 ' : '💬 '}
        {hint}
        {goalMet && (
          <span className="ml-1 text-xs opacity-60">(advancing in a moment…)</span>
        )}
      </div>
    </div>
  );
}
