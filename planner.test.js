import { test } from "node:test";
import assert from "node:assert/strict";
import { addSession, totalsBySubject, weekDates, minutesPerDay, streak, formatClock, formatHours } from "./planner.js";

test("adds valid session and rejects bad input", () => {
  const l = addSession([], { subject: "Math", minutes: "25", date: "2026-11-25" });
  assert.equal(l[0].minutes, 25);
  assert.throws(() => addSession([], { subject: "Art", minutes: 10, date: "2026-11-25" }));
  assert.throws(() => addSession([], { subject: "Math", minutes: 0, date: "2026-11-25" }));
  assert.throws(() => addSession([], { subject: "Math", minutes: 10, date: "25/11" }));
});
test("totals by subject", () => {
  let l = addSession([], { subject: "Math", minutes: 30, date: "2026-11-25" });
  l = addSession(l, { subject: "Math", minutes: 20, date: "2026-11-26" });
  l = addSession(l, { subject: "English", minutes: 15, date: "2026-11-26" });
  const t = totalsBySubject(l);
  assert.equal(t.Math, 50); assert.equal(t.English, 15); assert.equal(t.Physics, 0);
});
test("week is Monday-first (2026-11-25 is Wednesday)", () => {
  const w = weekDates("2026-11-25");
  assert.equal(w[0], "2026-11-23"); assert.equal(w[6], "2026-11-29");
  assert.equal(weekDates("2026-11-29")[0], "2026-11-23");
});
test("minutes per day and streak", () => {
  let l = addSession([], { subject: "Math", minutes: 30, date: "2026-11-24" });
  l = addSession(l, { subject: "Biology", minutes: 40, date: "2026-11-25" });
  assert.deepEqual(minutesPerDay(l, weekDates("2026-11-25")), [0, 30, 40, 0, 0, 0, 0]);
  assert.equal(streak(l, "2026-11-25"), 2);
  assert.equal(streak(l, "2026-11-27"), 0);
});
test("formatting", () => {
  assert.equal(formatClock(1500), "25:00"); assert.equal(formatClock(-4), "00:00");
  assert.equal(formatHours(95), "1h 35m"); assert.equal(formatHours(40), "40m");
});

import { weekProgress } from "./planner.js";
test("weekly plan progress only counts the chosen week", () => {
  let l = addSession([], { subject: "Math", minutes: 60, date: "2026-11-24" });
  l = addSession(l, { subject: "Math", minutes: 30, date: "2026-11-10" }); // other week
  const p = weekProgress(l, weekDates("2026-11-25"), { Math: 120, English: "abc" });
  const math = p.find((x) => x.subject === "Math"), eng = p.find((x) => x.subject === "English");
  assert.equal(math.done, 60); assert.equal(math.pct, 0.5); assert.equal(math.met, false);
  assert.equal(eng.goal, 0); assert.equal(eng.met, false);
  const met = weekProgress(l, weekDates("2026-11-25"), { Math: 45 }).find((x) => x.subject === "Math");
  assert.equal(met.met, true); assert.equal(met.pct, 1);
});
