import { mergeSubjects, addTask, toggleTask, removeTask, taskStats, sortTasks, nextPhase, addSession, weekProgress, weekDates, minutesPerDay, streak, formatClock, formatHours } from "./planner.js";

const KEY = "focus-desk-v1", GKEY = "focus-desk-goals-v1";
let goals = (() => { try { return JSON.parse(localStorage.getItem(GKEY)) || {}; } catch { return {}; } })();
const $ = (s) => document.querySelector(s);
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
let sessions = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } })();
const TKEY = "focus-desk-tasks-v1";
let tasks = (() => { try { return JSON.parse(localStorage.getItem(TKEY)) || []; } catch { return []; } })();
const saveTasks = () => localStorage.setItem(TKEY, JSON.stringify(tasks));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CKEY = "focus-desk-subjects-v1";
let custom = (() => { try { return JSON.parse(localStorage.getItem(CKEY)) || []; } catch { return []; } })();
let subjects = mergeSubjects(custom);
const fillSubjects = () => ["#subject", "#lsubject", "#tsubject"].forEach((id) => {
  const el = $(id), cur = el.value;
  el.innerHTML = subjects.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  if (subjects.includes(cur)) el.value = cur;
});
const save = () => localStorage.setItem(KEY, JSON.stringify(sessions));

// ---- timer
const BREAK = { short: 5, long: 15 };
let focusMin = 25, phase = "focus", doneFocus = 0, tick = null;
const lenOf = () => (phase === "focus" ? focusMin : BREAK[phase]) * 60;
let left = lenOf();
const PHASE_LABEL = { focus: "Focus", short: "Short break", long: "Long break" };
const subjectSel = $("#subject");
function paintTimer() {
  $("#clock").textContent = formatClock(left);
  $("#phase").textContent = PHASE_LABEL[phase];
  const done = 1 - left / lenOf();
  $("#ring").style.setProperty("--p", (done * 360).toFixed(1) + "deg");
  $("#start").textContent = tick ? "Pause" : left === lenOf() ? "Start" : "Resume";
  document.title = tick ? `${formatClock(left)} · Focus Desk` : "Focus Desk";
}
function finish() {
  clearInterval(tick); tick = null;
  if (phase === "focus") {
    sessions = addSession(sessions, { subject: subjectSel.value, minutes: focusMin, date: today(), taskId: $("#task").value || null });
    save(); doneFocus++;
  }
  phase = nextPhase(phase, doneFocus); left = lenOf(); paintTimer(); render();
}
$("#start").onclick = () => {
  if (tick) { clearInterval(tick); tick = null; }
  else {
    const end = Date.now() + left * 1000;
    tick = setInterval(() => { left = Math.round((end - Date.now()) / 1000); left <= 0 ? finish() : paintTimer(); }, 250);
  }
  paintTimer();
};
$("#reset").onclick = () => { clearInterval(tick); tick = null; left = lenOf(); paintTimer(); };
$("#task").onchange = () => { const t = tasks.find((x) => x.id === $("#task").value); if (t) subjectSel.value = t.subject; };
document.querySelectorAll("[data-min]").forEach((b) => (b.onclick = () => {
  focusMin = Number(b.dataset.min); clearInterval(tick); tick = null; phase = "focus"; left = lenOf();
  document.querySelectorAll("[data-min]").forEach((x) => x.classList.toggle("on", x === b)); paintTimer();
}));

// ---- manual log
$("#log").onsubmit = (e) => {
  e.preventDefault();
  try {
    sessions = addSession(sessions, { subject: $("#lsubject").value, minutes: $("#lminutes").value, date: $("#ldate").value });
    save(); $("#lminutes").value = ""; $("#err").textContent = ""; render();
  } catch (err) { $("#err").textContent = err.message; }
};
fillSubjects();
$("#addsub").onsubmit = (e) => {
  e.preventDefault();
  const v = $("#newsub").value.trim().replace(/\s+/g, " ");
  if (!v) return;
  if (v.length > 30) { $("#suberr").textContent = "30 characters max"; return; }
  if (!subjects.some((s) => s.toLowerCase() === v.toLowerCase())) { custom.push(v); localStorage.setItem(CKEY, JSON.stringify(custom)); subjects = mergeSubjects(custom); fillSubjects(); }
  $("#newsub").value = ""; $("#suberr").textContent = ""; render();
};
$("#ldate").value = today();

// ---- render
function render() {
  renderTasks();
  const days = weekDates(today());
  const per = minutesPerDay(sessions, days), max = Math.max(60, ...per);
  $("#week").innerHTML = days.map((d, i) =>
    `<div class="col ${d === today() ? "now" : ""}"><div class="bar" style="height:${(per[i] / max) * 100}%"></div><b>${["M","T","W","T","F","S","S"][i]}</b><small>${per[i] ? formatHours(per[i]) : "·"}</small></div>`).join("");
  const prog = weekProgress(sessions, days, goals, subjects);
  $("#subjects").innerHTML = prog.map((p) =>
    `<li class="${p.met ? "met" : ""}"><span>${p.subject}</span><i style="--w:${p.pct * 100}%"></i><em>${formatHours(p.done)}</em><input type="number" min="0" max="3000" step="15" value="${p.goal || ""}" placeholder="goal" data-goal="${p.subject}" aria-label="${p.subject} weekly goal in minutes"></li>`).join("");
  $("#total").textContent = formatHours(per.reduce((a, b) => a + b, 0));
  $("#streak").textContent = streak(sessions, today()) + " day" + (streak(sessions, today()) === 1 ? "" : "s");
  $("#recent").innerHTML = [...sessions].reverse().slice(0, 6).map((s) =>
    `<li><span>${s.date}</span>${s.subject}<em>${s.minutes}m</em></li>`).join("") || "<li class='none'>No sessions yet. Start the timer.</li>";
}
$("#addtask").onsubmit = (e) => {
  e.preventDefault();
  try {
    tasks = addTask(tasks, { title: $("#ttitle").value, subject: $("#tsubject").value, estimate: $("#test").value, due: $("#tdue").value });
    saveTasks(); $("#ttitle").value = ""; $("#test").value = ""; $("#tdue").value = ""; $("#terr").textContent = ""; render();
  } catch (err) { $("#terr").textContent = err.message; }
};
$("#tasklist").onclick = (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.closest("li").dataset.id;
  if (b.dataset.act === "done") tasks = toggleTask(tasks, id);
  if (b.dataset.act === "del") tasks = removeTask(tasks, id);
  if (b.dataset.act === "focus") { $("#task").value = id; $("#task").onchange(); window.scrollTo({ top: document.querySelector(".timer").offsetTop - 16, behavior: "smooth" }); }
  saveTasks(); render();
};
function renderTasks() {
  const t0 = today(), sel = $("#task").value;
  $("#tasklist").innerHTML = sortTasks(tasks, t0).map((t) => {
    const st = taskStats(sessions, t.id);
    const meta = [t.subject, t.due ? (t.due < t0 && !t.done ? "overdue " : "due ") + t.due : "", t.estimate ? `${st.sessions}/${t.estimate} sessions` : st.sessions ? `${st.sessions} sessions` : "", st.minutes ? formatHours(st.minutes) : ""].filter(Boolean).join(" · ");
    return `<li data-id="${t.id}" class="${t.done ? "done" : ""}"><button data-act="done" class="chk" aria-label="${t.done ? "Mark not done" : "Mark done"}" aria-pressed="${t.done}">${t.done ? "✓" : ""}</button><div><b>${esc(t.title)}</b><small>${esc(meta)}</small></div>${t.done ? "" : `<button data-act="focus" class="ghost sm">Focus</button>`}<button data-act="del" class="ghost sm" aria-label="Delete task">✕</button></li>`;
  }).join("") || "<li class='none'>No tasks yet. Add one above.</li>";
  $("#open").textContent = tasks.filter((t) => !t.done).length + " open";
  const open = tasks.filter((t) => !t.done);
  $("#task").innerHTML = '<option value="">No task</option>' + open.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`).join("");
  if (open.some((t) => t.id === sel)) $("#task").value = sel;
}
paintTimer(); render();

$("#subjects").onchange = (e) => {
  const s = e.target.dataset.goal; if (!s) return;
  goals[s] = Math.max(0, Math.round(Number(e.target.value) || 0));
  localStorage.setItem(GKEY, JSON.stringify(goals)); render();
};
