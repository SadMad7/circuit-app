/**
 * Interaction-history tracking — a different category from validators.ts.
 *
 * Validators are pure functions of the CURRENT SolveResult: re-solve and
 * they're correct again, no memory needed. Lesson 3's goal ("the user moved
 * the slider into both the high and low zone during the session") is not
 * derivable from the current circuit — at advancement time the circuit looks
 * identical whether the user swept the range or jumped straight to the final
 * value. The information lives in history, so it is tracked as it happens,
 * in the lesson player's per-lesson memory.
 *
 * Built for lesson 3's two-zone case only — do not generalize for later
 * lessons until they actually land.
 */

/** Which slider zones the user has committed into so far this lesson. */
export interface SliderZoneState {
  reachedLow: boolean;
  reachedHigh: boolean;
}

export const INITIAL_SLIDER_ZONES: SliderZoneState = {
  reachedLow: false,
  reachedHigh: false,
};

/**
 * Folds one committed resistance value into the zone state.
 * Returns the previous object unchanged (same reference) when the commit
 * doesn't newly reach a zone, so callers can cheaply detect "nothing changed".
 */
export function trackSliderZones(
  prev: SliderZoneState,
  committedOhm: number,
  goal: { lowMax: number; highMin: number },
): SliderZoneState {
  const reachedLow = prev.reachedLow || committedOhm <= goal.lowMax;
  const reachedHigh = prev.reachedHigh || committedOhm >= goal.highMin;
  if (reachedLow === prev.reachedLow && reachedHigh === prev.reachedHigh) {
    return prev;
  }
  return { reachedLow, reachedHigh };
}

/** True once both zones have been visited — the lesson 3 advancement trigger. */
export function sliderZoneGoalMet(state: SliderZoneState): boolean {
  return state.reachedLow && state.reachedHigh;
}
