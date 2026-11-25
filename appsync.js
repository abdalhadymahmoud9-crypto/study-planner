// Google sign-in + per-account sync for a small app that stores state in localStorage.
// Data path: users/{uid}/apps/{app}  (one document per app, so apps cannot overwrite each other).
// Security is enforced by Firestore rules (owner only). Only the listed keys sync.
import { firebaseConfig } from "./firebase-config.js";
const B = "https://www.gstatic.com/firebasejs/11.0.2/";
let M;
async function load() {
  if (M) return M;
  const [app, auth, fs] = await Promise.all([import(B + "firebase-app.js"), import(B + "firebase-auth.js"), import(B + "firebase-firestore.js")]);
  const a = app.initializeApp(firebaseConfig);
  return (M = { auth, fs, au: auth.getAuth(a), db: fs.getFirestore(a) });
}
export function initSync({ app, keys, authEl, statusEl }) {
  const FLAG = `sync:${app}:on`, BUCKET = (id) => `sync:${app}:bucket:${id}`, ACTIVE = `sync:${app}:active`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const status = (t) => { if (statusEl) statusEl.textContent = t; };
  const snap = () => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]).filter(([, v]) => v !== null));
  const apply = (o) => { keys.forEach((k) => (k in o ? localStorage.setItem(k, o[k]) : localStorage.removeItem(k))); };
  let uid = null, timer = null, applying = false, stop = null;
  const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
  const touched = (k) => { if (!applying && uid && keys.includes(k)) { clearTimeout(timer); status("Saving…"); timer = setTimeout(push, 700); } };
  Storage.prototype.setItem = function (k, v) { nativeSet.call(this, k, v); if (this === localStorage) touched(k); };
  Storage.prototype.removeItem = function (k) { nativeRemove.call(this, k); if (this === localStorage) touched(k); };
  async function push() {
    const { fs, db } = await load(), u = uid; if (!u) return;
    try { await fs.setDoc(fs.doc(db, "users", u, "apps", app), { json: JSON.stringify(snap()), updatedAt: Date.now() }); status("Synced to your account."); }
    catch (e) { status("Not synced: " + (e.code || e.message)); }
  }
  function paint(user) {
    authEl.innerHTML = user ? `<span class="who">${esc(user.displayName || user.email || "Signed in")}</span> <button type="button" data-a="out">Sign out</button>` : `<button type="button" data-a="in">Sign in with Google</button>`;
  }
  function swapTo(id) { // park the live keys in the bucket of whoever owned them, then load the new owner's bucket
    const from = localStorage.getItem(ACTIVE) || "device";
    if (from === id) return false;
    nativeSet.call(localStorage, BUCKET(from), JSON.stringify(snap()));
    let next = {}; try { next = JSON.parse(localStorage.getItem(BUCKET(id))) || {}; } catch {}
    applying = true; apply(next); applying = false;
    nativeSet.call(localStorage, ACTIVE, id); return true;
  }
  async function start() {
    let m; try { m = await load(); } catch { status("Sync unavailable (offline?). Saved on this device only."); return; }
    m.auth.onAuthStateChanged(m.au, async (user) => {
      if (stop) { stop(); stop = null; } clearTimeout(timer);
      paint(user);
      if (!user) { uid = null; nativeRemove.call(localStorage, FLAG); status("Saved on this device only. Sign in to sync."); if (swapTo("device")) location.reload(); return; }
      nativeSet.call(localStorage, FLAG, "1");
      const changed = swapTo(user.uid); uid = user.uid; status("Syncing…");
      const ref = m.fs.doc(m.db, "users", user.uid, "apps", app); let first = true;
      stop = m.fs.onSnapshot(ref, async (s) => {
        if (s.metadata.hasPendingWrites) return;
        let remote = null; if (s.exists()) { try { remote = JSON.parse(s.data().json); } catch {} }
        if (first) {
          first = false;
          if (!remote) { // nothing in the account yet: offer to copy this device's saved data in, never silently
            let dev = {}; try { dev = JSON.parse(localStorage.getItem(BUCKET("device"))) || {}; } catch {}
            if (Object.keys(snap()).length === 0 && Object.keys(dev).length && confirm("Copy this device's saved data into your account?")) { applying = true; apply(dev); applying = false; }
            if (Object.keys(snap()).length) await push(); else status("Synced to your account.");
            if (Object.keys(snap()).length && changed) location.reload();
            return;
          }
        }
        if (remote && JSON.stringify(remote) !== JSON.stringify(snap())) {
          applying = true; apply(remote); applying = false;
          const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "");
          if (first || !typing) location.reload(); else status("Updated from another device. Reload to see it.");
        } else status(s.metadata.fromCache ? "Offline, showing saved copy." : "Synced to your account.");
      }, (e) => status("Not synced: " + (e.code || e.message)));
    });
  }
  authEl.addEventListener("click", async (e) => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return;
    await start(); const m = await load();
    if (a === "in") { try { await m.auth.signInWithPopup(m.au, new m.auth.GoogleAuthProvider()); } catch (err) { status("Sign-in failed: " + (err.code || err.message)); } }
    else await m.auth.signOut(m.au);
  });
  paint(null); status("Saved on this device only. Sign in to sync.");
  if (localStorage.getItem(FLAG)) start();
  return { push };
}
