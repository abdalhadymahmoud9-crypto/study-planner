import { test } from "node:test";
import assert from "node:assert/strict";
import { addSession, totalsBySubject, weekDates, minutesPerDay, streak, formatClock, formatHours, addTask, toggleTask, removeTask, taskStats, sortTasks, nextPhase, mergeSubjects, SUBJECTS, weekProgress } from "./planner.js";

test("adds valid session and rejects bad input", () => {
  const l = addSession([], { subject: "Math", minutes: "25", date: "2026-11-25" });
  assert.equal(l[0].minutes, 25);
  assert.throws(() => addSession([], { subject: "  ", minutes: 10, date: "2026-11-25" }));
  assert.equal(addSession([], { subject: "Art  History", minutes: 10, date: "2026-11-25" })[0].subject, "Art History");
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

test("tasks: add, validate, toggle, remove, unique ids", () => {
  let t = addTask([], { title: "  Past paper  ", subject: "Math", estimate: "3", due: "2026-11-27" });
  assert.equal(t[0].title, "Past paper"); assert.equal(t[0].estimate, 3);
  t = addTask(t, { title: "Essay", subject: "English", estimate: 0, due: "" });
  assert.notEqual(t[0].id, t[1].id);
  assert.throws(() => addTask(t, { title: " ", subject: "Math" }));
  assert.throws(() => addTask(t, { title: "x", subject: "" }));
  assert.throws(() => addTask(t, { title: "x", subject: "Math", due: "tomorrow" }));
  t = toggleTask(t, t[0].id); assert.equal(t[0].done, true);
  t = removeTask(t, t[0].id); assert.equal(t.length, 1);
  assert.equal(addTask(t, { title: "n", subject: "Math" })[1].id, "t3");
});
test("sessions link to tasks and sum per task", () => {
  let s = addSession([], { subject: "Math", minutes: 25, date: "2026-11-25", taskId: "t1" });
  s = addSession(s, { subject: "Math", minutes: 25, date: "2026-11-25", taskId: "t1" });
  s = addSession(s, { subject: "Math", minutes: 10, date: "2026-11-25" });
  assert.deepEqual(taskStats(s, "t1"), { sessions: 2, minutes: 50 });
  assert.deepEqual(taskStats(s, "t9"), { sessions: 0, minutes: 0 });
});
test("sortTasks: overdue, then dated, then undated, done last", () => {
  let t = [];
  for (const [title, due] of [["a", ""], ["b", "2026-11-30"], ["c", "2026-11-20"], ["d", "2026-11-26"]]) t = addTask(t, { title, subject: "Math", due });
  t = toggleTask(t, "t4");
  assert.deepEqual(sortTasks(t, "2026-11-25").map((x) => x.title), ["c", "b", "a", "d"]);
});
test("break cycle: long break after every 4th focus", () => {
  assert.equal(nextPhase("focus", 1), "short"); assert.equal(nextPhase("focus", 4), "long");
  assert.equal(nextPhase("short", 1), "focus"); assert.equal(nextPhase("long", 4), "focus");
});

test("default subjects include Programming, Artificial Intelligence, Other", () => {
  for (const s of ["Programming", "Artificial Intelligence", "Other"]) assert.ok(SUBJECTS.includes(s));
});
test("custom subjects merge without duplicates; old logs still count", () => {
  const m = mergeSubjects(["Robotics", "math", " ", "Robotics"]);
  assert.equal(m.filter((x) => x.toLowerCase() === "math").length, 1);
  assert.equal(m.filter((x) => x === "Robotics").length, 1);
  const l = addSession([], { subject: "Robotics", minutes: 40, date: "2026-11-25" });
  const p = weekProgress(l, ["2026-11-25"], { Robotics: 60 }, SUBJECTS).find((x) => x.subject === "Robotics");
  assert.equal(p.done, 40); assert.equal(p.goal, 60);
  assert.equal(totalsBySubject(l).Robotics, 40);
});
