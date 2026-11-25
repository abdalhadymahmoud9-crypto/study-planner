// Pure logic for the study planner: sessions, totals, timer formatting.
export const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology", "English", "Arabic", "History"];

export function addSession(list, { subject, minutes, date, taskId = null }) {
  const m = Math.round(Number(minutes));
  if (!SUBJECTS.includes(subject)) throw new Error("Unknown subject");
  if (!Number.isFinite(m) || m <= 0 || m > 600) throw new Error("Minutes must be 1-600");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Bad date");
  return [...list, { id: `${date}-${list.length}-${m}`, subject, minutes: m, date, ...(taskId ? { taskId } : {}) }];
}

export function totalsBySubject(list) {
  const out = Object.fromEntries(SUBJECTS.map((s) => [s, 0]));
  for (const s of list) out[s.subject] += s.minutes;
  return out;
}

// Monday-first week containing `date` (YYYY-MM-DD), as 7 date strings.
export function weekDates(date) {
  const d = new Date(date + "T12:00:00Z");
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d); x.setUTCDate(d.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

export function minutesPerDay(list, dates) {
  return dates.map((day) => list.filter((s) => s.date === day).reduce((a, s) => a + s.minutes, 0));
}

// Consecutive days up to and including `today` with at least one session.
export function streak(list, today) {
  const days = new Set(list.map((s) => s.date));
  let n = 0;
  const d = new Date(today + "T12:00:00Z");
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function formatHours(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Weekly plan: target minutes per subject vs what was actually logged in the given week.
export function weekProgress(list, dates, goals) {
  const inWeek = list.filter((s) => dates.includes(s.date));
  const done = totalsBySubject(inWeek);
  return SUBJECTS.map((subject) => {
    const goal = Math.max(0, Math.round(Number(goals[subject]) || 0));
    return { subject, done: done[subject], goal, pct: goal ? Math.min(1, done[subject] / goal) : 0, met: goal > 0 && done[subject] >= goal };
  });
}

// ---- tasks (each task can be focused on; sessions link back by taskId)
export function addTask(tasks, { title, subject, estimate, due }) {
  const t = String(title || "").trim();
  if (!t) throw new Error("Task needs a title");
  if (t.length > 120) throw new Error("Title is too long");
  if (!SUBJECTS.includes(subject)) throw new Error("Unknown subject");
  const est = Math.round(Number(estimate) || 0);
  if (est < 0 || est > 50) throw new Error("Estimate must be 0-50 sessions");
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error("Bad date");
  const n = tasks.reduce((m, x) => Math.max(m, Number(x.id.slice(1)) || 0), 0) + 1;
  return [...tasks, { id: "t" + n, title: t, subject, estimate: est, due: due || "", done: false }];
}
export const toggleTask = (tasks, id) => tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
export const removeTask = (tasks, id) => tasks.filter((t) => t.id !== id);
export function taskStats(sessions, id) {
  const own = sessions.filter((s) => s.taskId === id);
  return { sessions: own.length, minutes: own.reduce((a, s) => a + s.minutes, 0) };
}
export function sortTasks(tasks, today) {
  const rank = (t) => (t.done ? 3 : !t.due ? 2 : t.due < today ? 0 : 1);
  return [...tasks].sort((a, b) => rank(a) - rank(b) || (a.due || "9").localeCompare(b.due || "9") || a.id.localeCompare(b.id, undefined, { numeric: true }));
}
// After a focus block: long break every `every` completed focus blocks, otherwise short.
export function nextPhase(phase, completedFocus, every = 4) {
  if (phase !== "focus") return "focus";
  return completedFocus % every === 0 ? "long" : "short";
}
