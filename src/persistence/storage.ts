/**
 * localStorage adapter — lesson progress only.
 * No accounts, no circuit state, no cross-device sync (see CLAUDE.md guardrails).
 */

const STORAGE_KEY = 'circuitlingo-progress-v1';

export interface PersistedProgress {
  currentLessonId: string;
  completedLessons: Record<string, boolean>;
  sandboxUnlocked: boolean;
}

const DEFAULTS: PersistedProgress = {
  currentLessonId: 'lesson-01-complete-loop',
  completedLessons: {},
  sandboxUnlocked: false,
};

export function loadProgress(): PersistedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) } as PersistedProgress;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveProgress(progress: PersistedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage quota exceeded or private browsing — fail silently
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
