const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildFocusSession,
  calculateFocusStats,
  formatTime,
  getElapsedMinutes,
  toSessionDate
} = require("../src/utils/focusMetrics");

test("formatTime renders padded minute and second values", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(65), "01:05");
  assert.equal(formatTime(45 * 60), "45:00");
});

test("formatTime clamps invalid and negative values", () => {
  assert.equal(formatTime(-30), "00:00");
  assert.equal(formatTime(undefined), "00:00");
});

test("calculateFocusStats summarizes all sessions and today's progress", () => {
  const sessions = [
    { minutes: 45, date: "2026-06-20" },
    { minutes: 30, date: "2026-06-20" },
    { minutes: 60, date: "2026-06-19" }
  ];

  assert.deepEqual(calculateFocusStats(sessions, 150, "2026-06-20"), {
    total: 135,
    todayMinutes: 75,
    progress: 50,
    count: 3
  });
});

test("calculateFocusStats caps daily progress at 100 percent", () => {
  const sessions = [{ minutes: 240, date: "2026-06-20" }];

  assert.equal(calculateFocusStats(sessions, 180, "2026-06-20").progress, 100);
});

test("calculateFocusStats handles empty or missing sessions", () => {
  assert.deepEqual(calculateFocusStats(undefined, 180, "2026-06-20"), {
    total: 0,
    todayMinutes: 0,
    progress: 0,
    count: 0
  });
});

test("buildFocusSession creates a dated session payload", () => {
  const now = new Date("2026-06-20T03:20:00.000Z");

  assert.deepEqual(buildFocusSession("Focus Timer", 45, now), {
    mode: "Focus Timer",
    minutes: 45,
    date: "2026-06-20"
  });
});

test("getElapsedMinutes rounds elapsed time and never returns less than one", () => {
  assert.equal(getElapsedMinutes(1000, 45, 62000), 1);
  assert.equal(getElapsedMinutes(1000, 45, 151000), 3);
  assert.equal(getElapsedMinutes(null, 45, 151000), 45);
});

test("toSessionDate normalizes date-like input to yyyy-mm-dd", () => {
  assert.equal(toSessionDate("2026-06-20T23:59:59.000Z"), "2026-06-20");
});
