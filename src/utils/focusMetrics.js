const DEFAULT_DAILY_GOAL = 180;

function toSessionDate(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10);
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function calculateFocusStats(sessions, dailyGoal = DEFAULT_DAILY_GOAL, today = toSessionDate()) {
  const normalizedSessions = Array.isArray(sessions) ? sessions : [];
  const total = normalizedSessions.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const todayMinutes = normalizedSessions
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const progress = dailyGoal > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoal) * 100)) : 0;

  return {
    total,
    todayMinutes,
    progress,
    count: normalizedSessions.length
  };
}

function getElapsedMinutes(startedAt, fallbackMinutes, now = Date.now()) {
  if (!startedAt) return fallbackMinutes;
  return Math.max(1, Math.round((now - startedAt) / 60000));
}

function buildFocusSession(mode, minutes, now = new Date()) {
  return {
    mode,
    minutes,
    date: toSessionDate(now)
  };
}

module.exports = {
  DEFAULT_DAILY_GOAL,
  buildFocusSession,
  calculateFocusStats,
  formatTime,
  getElapsedMinutes,
  toSessionDate
};
