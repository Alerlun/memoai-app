// ── XP earned per action ─────────────────────────────────────────────────────
export const XP_VALUES = {
  LEARN_EASY:          15,
  LEARN_GOOD:          10,
  LEARN_HARD:           5,
  LEARN_AGAIN:          2,
  QUIZ_CORRECT:        10,
  QUIZ_PERFECT_BONUS:  50,
  FLASHCARD_GOT:        5,
  STREAK_BONUS:        50,
  DAILY_GOAL_BONUS:    50,
  PRACTICE_TEST_A:    100,
  PRACTICE_TEST_B:     75,
  PRACTICE_TEST_C:     50,
  PRACTICE_TEST_D:     25,
  PRACTICE_TEST_F:     10,
}

export const DAILY_GOAL = 20  // cards per day

// ── Account-level XP ─────────────────────────────────────────────────────────
// Flat 200 XP per level. Level 100 = 20 000 total XP.
export const XP_PER_LEVEL = 200

export function getLevelFromXP(totalXP) {
  return Math.max(1, Math.floor((totalXP ?? 0) / XP_PER_LEVEL) + 1)
}

export function getXPProgress(totalXP) {
  const xp      = totalXP ?? 0
  const level   = getLevelFromXP(xp)
  const start   = (level - 1) * XP_PER_LEVEL
  const progress = xp - start
  return {
    level,
    progress,
    required: XP_PER_LEVEL,
    pct: Math.min(100, Math.round((progress / XP_PER_LEVEL) * 100)),
  }
}

// ── Per-set levels (based on set.progress 0-100) ──────────────────────────────
export const SET_LEVELS = [
  { min: 80, label: 'Master',     icon: '🏆', color: 'var(--gn)',  bg: 'var(--gl)' },
  { min: 60, label: 'Proficient', icon: '⭐', color: '#60a5fa',   bg: 'rgba(96,165,250,.13)' },
  { min: 40, label: 'Learner',    icon: '🎯', color: 'var(--am)',  bg: 'var(--aml)' },
  { min: 20, label: 'Novice',     icon: '📖', color: 'var(--ac)',  bg: 'var(--al)' },
  { min: 0,  label: 'Beginner',   icon: '🌱', color: 'var(--t2)', bg: 'var(--s3)' },
]

export function getSetLevel(progress, testGrade = null) {
  const level = SET_LEVELS.find(l => (progress ?? 0) >= l.min) ?? SET_LEVELS[SET_LEVELS.length - 1]
  if (level.min === 80 && testGrade !== 'A') return { ...level, locked: true }
  return level
}

// ── Grade thresholds ──────────────────────────────────────────────────────────
export const GRADES = [
  { letter: 'A', min: 90, color: '#4ade80', bg: 'rgba(74,222,128,.15)', label: 'Outstanding! You\'ve mastered this material.' },
  { letter: 'B', min: 80, color: '#60a5fa', bg: 'rgba(96,165,250,.15)',  label: 'Great work! Almost perfect — review the missed ones.' },
  { letter: 'C', min: 70, color: '#fbbf24', bg: 'rgba(251,191,36,.15)',  label: 'Good effort! Study the explanations and retake.' },
  { letter: 'D', min: 60, color: '#f97316', bg: 'rgba(249,115,22,.15)',  label: 'Keep pushing! Review all topics and try again.' },
  { letter: 'F', min: 0,  color: '#f87171', bg: 'rgba(248,113,113,.15)', label: 'Back to the books — study more before retaking.' },
]

export function getGrade(pct) {
  return GRADES.find(g => pct >= g.min) ?? GRADES[GRADES.length - 1]
}

// ── Account milestones ────────────────────────────────────────────────────────
export const MILESTONES = [
  { level: 100, icon: '🏆', label: 'Legend',       reward: '1 month Pro free — contact us to claim!' },
  { level: 75,  icon: '🧙', label: 'Wizard',        reward: null },
  { level: 50,  icon: '🦅', label: 'Scholar',       reward: null },
  { level: 25,  icon: '💎', label: 'Knowledge Gem', reward: null },
  { level: 10,  icon: '🔥', label: 'On Fire',       reward: null },
  { level: 5,   icon: '🌟', label: 'Rising Star',   reward: null },
]

export function getMilestone(level) {
  return MILESTONES.find(m => m.level === level) ?? null
}

// Next upcoming milestone for a given level
export function getNextMilestone(level) {
  return [...MILESTONES].reverse().find(m => m.level > level) ?? null
}
