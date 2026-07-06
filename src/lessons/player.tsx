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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../state/store';
import { convertToCircuit } from '../canvas/converter';

// Lesson registry — Phase 3 adds the rest
import { lesson01 } from './definitions/lesson-01-complete-loop';
import { lesson02 } from './definitions/lesson-02-resistor';
import { lesson03 } from './definitions/lesson-03-ohms-law';
import { lesson04 } from './definitions/lesson-04-series';
import { lesson05 } from './definitions/lesson-05-parallel';
import type { Lesson } from './types';
import {
  INITIAL_SLIDER_ZONES,
  trackSliderZones,
  sliderZoneGoalMet,
} from './interaction';

const LESSONS_MAP: Record<string, Lesson> = {
  [lesson01.id]: lesson01,
  [lesson02.id]: lesson02,
  [lesson03.id]: lesson03,
  [lesson04.id]: lesson04,
  [lesson05.id]: lesson05,
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

  // Per-lesson interaction history (lesson 3's slider zones). This is a
  // different category from the SolveResult validators: it records what the
  // user DID over time, not what the circuit IS. A ref (not state) because it
  // only matters when a commit re-solves — the solveResult change already
  // re-runs the advancement effect.
  const sliderZones = useRef(INITIAL_SLIDER_ZONES);

  // Kick off the first lesson on mount if nothing is loaded yet
  const nodes = useAppStore((s) => s.nodes);
  useEffect(() => {
    if (nodes.length === 0 && lesson) {
      loadLesson(currentLessonId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Converted Circuit for topology-reading validators and hints (lesson 5's
  // series/parallel check reads shared terminal NodeIds, not solved values).
  const circuit = useMemo(
    () => convertToCircuit(nodes, edges),
    [nodes, edges],
  );

  // Reset interaction history whenever the lesson changes.
  useEffect(() => {
    sliderZones.current = INITIAL_SLIDER_ZONES;
  }, [currentLessonId]);

  // Check advancement on every solveResult change.
  //
  // Two goal categories, one per lesson:
  //   • sliderGoal — interaction history: fold the committed resistance into
  //     the zone record, advance once both zones have been visited.
  //   • advancement — a pure function of the current SolveResult.
  //
  // The advance timer is cleared only when the circuit breaks (below) or on
  // unmount (separate effect) — never as this effect's cleanup. Clearing on
  // cleanup would cancel the timer the moment setGoalMet(true) re-runs the
  // effect, so the lesson would never advance.
  useEffect(() => {
    if (!lesson) return;

    let met: boolean;
    if (lesson.sliderGoal) {
      // resistanceOhm only changes on slider release, so node data always
      // holds the committed value — never a mid-drag one.
      const target = nodes.find((n) => n.id === lesson.sliderGoal!.componentId);
      const committedOhm = target?.data.resistanceOhm;
      if (committedOhm !== undefined) {
        sliderZones.current = trackSliderZones(
          sliderZones.current,
          committedOhm,
          lesson.sliderGoal,
        );
      }
      met = sliderZoneGoalMet(sliderZones.current);
    } else {
      met = lesson.advancement ? lesson.advancement(solveResult, circuit) : false;
    }

    if (met && !goalMet) {
      setGoalMet(true);
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null;
        completeCurrentLesson();
        setGoalMet(false);
      }, ADVANCE_DELAY);
    } else if (!met && goalMet) {
      // User broke the circuit after meeting the goal — cancel the advance
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
      setGoalMet(false);
    }
  }, [solveResult, nodes, circuit, lesson, goalMet, completeCurrentLesson]);

  // Clear any pending advance timer on unmount only.
  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
        No lesson loaded.
      </div>
    );
  }

  const isCompleted = completedLessons[lesson.id];
  const hint = lesson.hint(solveResult, edges, circuit);

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
