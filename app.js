import { SUBJECTS, addSession, weekProgress, weekDates, minutesPerDay, streak, formatClock, formatHours } from "./planner.js";

const KEY = "focus-desk-v1", GKEY = "focus-desk-goals-v1";
let goals = (() => { try { return JSON.parse(localStorage.getItem(GKEY)) || {}; } catch { return {}; } })();
const $ = (s) => document.querySelector(s);
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
let sessions = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } })();
const save = () => localStorage.setItem(KEY, JSON.stringify(sessions));

// ---- timer
let focusMin = 25, left = focusMin * 60, tick = null;
const subjectSel = $("#subject");
SUBJECTS.forEach((s) => subjectSel.append(new Option(s, s)));
function paintTimer() {
  $("#clock").textContent = formatClock(left);
  const done = 1 - left / (focusMin * 60);
  $("#ring").style.setProperty("--p", (done * 360).toFixed(1) + "deg");
  $("#start").textContent = tick ? "Pause" : left === focusMin * 60 ? "Start" : "Resume";
  document.title = tick ? `${formatClock(left)} · Focus Desk` : "Focus Desk";
}
function finish() {
  clearInterval(tick); tick = null;
  sessions = addSession(sessions, { subject: subjectSel.value, minutes: focusMin, date: today() });
  save(); left = focusMin * 60; paintTimer(); render();
}
$("#start").onclick = () => {
  if (tick) { clearInterval(tick); tick = null; }
  else {
    const end = Date.now() + left * 1000;
    tick = setInterval(() => { left = Math.round((end - Date.now()) / 1000); left <= 0 ? finish() : paintTimer(); }, 250);
  }
  paintTimer();
};
$("#reset").onclick = () => { clearInterval(tick); tick = null; left = focusMin * 60; paintTimer(); };
document.querySelectorAll("[data-min]").forEach((b) => (b.onclick = () => {
  focusMin = Number(b.dataset.min); clearInterval(tick); tick = null; left = focusMin * 60;
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
SUBJECTS.forEach((s) => $("#lsubject").append(new Option(s, s)));
$("#ldate").value = today();

// ---- render
function render() {
  const days = weekDates(today());
  const per = minutesPerDay(sessions, days), max = Math.max(60, ...per);
  $("#week").innerHTML = days.map((d, i) =>
    `<div class="col ${d === today() ? "now" : ""}"><div class="bar" style="height:${(per[i] / max) * 100}%"></div><b>${["M","T","W","T","F","S","S"][i]}</b><small>${per[i] ? formatHours(per[i]) : "·"}</small></div>`).join("");
  const prog = weekProgress(sessions, days, goals);
  $("#subjects").innerHTML = prog.map((p) =>
    `<li class="${p.met ? "met" : ""}"><span>${p.subject}</span><i style="--w:${p.pct * 100}%"></i><em>${formatHours(p.done)}</em><input type="number" min="0" max="3000" step="15" value="${p.goal || ""}" placeholder="goal" data-goal="${p.subject}" aria-label="${p.subject} weekly goal in minutes"></li>`).join("");
  $("#total").textContent = formatHours(per.reduce((a, b) => a + b, 0));
  $("#streak").textContent = streak(sessions, today()) + " day" + (streak(sessions, today()) === 1 ? "" : "s");
  $("#recent").innerHTML = [...sessions].reverse().slice(0, 6).map((s) =>
    `<li><span>${s.date}</span>${s.subject}<em>${s.minutes}m</em></li>`).join("") || "<li class='none'>No sessions yet. Start the timer.</li>";
}
paintTimer(); render();

$("#subjects").onchange = (e) => {
  const s = e.target.dataset.goal; if (!s) return;
  goals[s] = Math.max(0, Math.round(Number(e.target.value) || 0));
  localStorage.setItem(GKEY, JSON.stringify(goals)); render();
};
