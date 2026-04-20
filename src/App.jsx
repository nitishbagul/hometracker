import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase";
import { api } from "./lib/api";

const fmt = iso => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const displayName = email => email?.split("@")[0] ?? "user";
const emptyDb = () => ({ houses: [], sections: [], places: [], items: [], acts: [], invites: [], members: [] });

const T = {
  bg: "#FAFAF8", bgCard: "#FFFFFF", bgSidebar: "#F3F2EE", bgHover: "#EEECEA",
  accent: "#4338CA", accentLight: "#EEF2FF", accentText: "#312E81",
  text: "#1C1B17", muted: "#6E6D63", border: "#E4E2DA", borderMed: "#D4D2CA",
  success: "#065F46", successBg: "#ECFDF5",
  warn: "#92400E", warnBg: "#FFFBEB",
  danger: "#9B1C1C", dangerBg: "#FEF2F2",
  radius: "10px", radiusSm: "6px",
};

const css = {
  card: { background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "1.125rem 1.25rem" },
  input: { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.borderMed}`, background: T.bgCard, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" },
  label: { fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: "0.04em", marginBottom: 5, display: "block", textTransform: "uppercase" },
};

function Btn({ children, onClick, variant = "ghost", size = "md", full, style = {}, disabled }) {
  const v = { primary: { background: T.accent, color: "#fff", border: "none", fontWeight: 600 }, ghost: { background: "transparent", color: T.text, border: `1px solid ${T.border}`, fontWeight: 500 }, danger: { background: "transparent", color: T.danger, border: "none", fontWeight: 500 }, subtle: { background: T.bgHover, color: T.text, border: "none", fontWeight: 500 }, success: { background: T.successBg, color: T.success, border: "none", fontWeight: 600 } };
  const s = { sm: "5px 10px", md: "8px 16px", lg: "10px 20px" };
  return (
    <button disabled={disabled} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: s[size], borderRadius: T.radiusSm, cursor: disabled ? "default" : "pointer", fontSize: size === "sm" ? 12 : 13, fontFamily: "inherit", transition: "opacity 0.12s", width: full ? "100%" : undefined, opacity: disabled ? 0.5 : 1, ...v[variant], ...style }}
      onClick={onClick}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? "0.5" : "1"; }}>
      {children}
    </button>
  );
}

function Tag({ label, color = "neutral" }) {
  const m = { neutral: [T.bgHover, T.muted], accent: [T.accentLight, T.accentText], green: [T.successBg, T.success], amber: [T.warnBg, T.warn], red: [T.dangerBg, T.danger] };
  const [bg, fg] = m[color] || m.neutral;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: bg, color: fg, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{label}</span>;
}

function Empty({ icon = "○", title, sub, action }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
      <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>{sub}</div>}
      {action}
    </div>
  );
}

function Crumb({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ color: T.border, fontSize: 14 }}>›</span>}
          {item.onClick
            ? <button onClick={item.onClick} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, color: T.accent, fontFamily: "inherit", fontWeight: 500 }}>{item.label}</button>
            : <span style={{ fontSize: 13, color: T.muted }}>{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

function StatCard({ label, value, color = T.text }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "0.875rem 1rem" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function Toast({ msg, type = "error" }) {
  if (!msg) return null;
  const bg = type === "error" ? T.dangerBg : T.successBg;
  const fg = type === "error" ? T.danger : T.success;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: bg, color: fg, border: `1px solid ${fg}30`, borderRadius: T.radius, padding: "10px 16px", fontSize: 13, fontWeight: 500, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxWidth: 320 }}>
      {msg}
    </div>
  );
}

function Avatar({ email, size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.floor(size * 0.4), fontWeight: 700, color: "#fff", flexShrink: 0, title: email }}>
      {displayName(email)[0].toUpperCase()}
    </div>
  );
}

/* ─── INVITE BANNER ─────────────────────────────────────────────────────── */
function InviteBanner({ invites, onAccept, onDecline }) {
  if (!invites.length) return null;
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Pending invites</div>
      {invites.map(inv => (
        <div key={inv.id} style={{ ...css.card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, borderLeft: `3px solid ${T.accent}` }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>
              You've been invited to <span style={{ color: T.accent }}>{inv.house_name}</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>Invited by {inv.inviter_email} · {fmt(inv.created_at)}</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Btn variant="success" size="sm" onClick={() => onAccept(inv)}>Accept</Btn>
            <Btn variant="danger" size="sm" onClick={() => onDecline(inv)}>Decline</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MODAL ─────────────────────────────────────────────────────────────── */
function Modal({ modal, onClose, db, allPlaces, fns }) {
  const [val, setVal] = useState("");
  const [pid, setPid] = useState(() => {
    if (modal.type === "move_item") return db.items.find(i => i.id === modal.itemId)?.place_id || "";
    return modal.targetPlaceId || "";
  });
  const [iid, setIid] = useState(modal.itemId || "");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const cfg = {
    add_house:     { title: "Add house",           ph: "e.g. My home, Weekend cabin" },
    add_section:   { title: "Add room / section",  ph: "e.g. Master bedroom, Kitchen, Garage" },
    add_place:     { title: "Add storage place",   ph: "e.g. Closet, Top drawer, Shelf B" },
    add_item:      { title: "Add item",             ph: "e.g. Car spare keys, Old photo album" },
    move_item:     { title: modal.itemId ? "Place / move item" : "Move item to this place" },
    invite_member: { title: "Invite someone",       ph: "their@email.com" },
  };

  const submit = async () => {
    if (modal.type !== "move_item" && !val.trim()) return;
    setLoading(true);
    try {
      if (modal.type === "add_house")        await fns.addHouse(val.trim());
      else if (modal.type === "add_section") await fns.addSection(modal.houseId, val.trim());
      else if (modal.type === "add_place")   await fns.addPlace(modal.sectionId, val.trim());
      else if (modal.type === "add_item")    await fns.addItem(val.trim());
      else if (modal.type === "move_item")   await fns.moveItem(modal.itemId || iid, pid || null);
      else if (modal.type === "invite_member") await fns.sendInvite(modal.houseId, val.trim());
      onClose();
    } catch (e) { fns.showToast(e.message); }
    setLoading(false);
  };

  const isMove = modal.type === "move_item";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(2px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...css.card, width: 420, padding: "1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", margin: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{cfg[modal.type].title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.muted, padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>

        {isMove ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!modal.itemId && (
              <div>
                <label style={css.label}>Item</label>
                <select ref={inputRef} value={iid} onChange={e => setIid(e.target.value)} style={css.input}>
                  <option value="">— Select an item —</option>
                  {db.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            )}
            {modal.itemId && (
              <div style={{ background: T.bgHover, borderRadius: T.radiusSm, padding: "10px 12px" }}>
                <span style={{ fontSize: 12, color: T.muted }}>Item: </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{db.items.find(i => i.id === modal.itemId)?.name}</span>
              </div>
            )}
            <div>
              <label style={css.label}>Assign to place</label>
              <select ref={modal.itemId ? inputRef : undefined} value={pid} onChange={e => setPid(e.target.value)} style={css.input}>
                <option value="">— Unassigned —</option>
                {allPlaces.map(p => {
                  const sec = db.sections.find(s => s.id === p.section_id);
                  const house = sec ? db.houses.find(h => h.id === sec.house_id) : null;
                  return <option key={p.id} value={p.id}>{house?.name} › {sec?.name} › {p.name}</option>;
                })}
              </select>
            </div>
          </div>
        ) : modal.type === "invite_member" ? (
          <div>
            <label style={css.label}>Email address</label>
            <input ref={inputRef} type="email" style={css.input} value={val} onChange={e => setVal(e.target.value)}
              placeholder={cfg[modal.type].ph} onKeyDown={e => e.key === "Enter" && submit()} />
            <p style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>They'll see the invite next time they log in.</p>
          </div>
        ) : (
          <div>
            <label style={css.label}>Name</label>
            <input ref={inputRef} style={css.input} value={val} onChange={e => setVal(e.target.value)}
              placeholder={cfg[modal.type].ph} onKeyDown={e => e.key === "Enter" && submit()} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <Btn onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} disabled={loading}>{loading ? "Saving…" : isMove ? "Confirm" : modal.type === "invite_member" ? "Send invite" : "Add"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ─── AUTH ──────────────────────────────────────────────────────────────── */
function AuthPage({ onLogin, onRegister, onForgotPassword, error, loading }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const submit = () => {
    if (mode === "login") onLogin(email, password);
    else if (mode === "register") onRegister(email, password);
  };

  const submitForgot = async () => {
    if (!email) return;
    setForgotLoading(true);
    await onForgotPassword(email);
    setForgotSent(true);
    setForgotLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "inherit", padding: "1rem" }}>
      <div style={{ width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 52, height: 52, background: T.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🏠</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.03em" }}>HomeTracker</h1>
          <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>Never lose track of where things are kept</p>
        </div>
        <div style={{ ...css.card, padding: "1.75rem", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          {mode === "forgot" ? (
            forgotSent ? (
              <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 6px" }}>Check your email</p>
                <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px" }}>We sent a password reset link to <strong>{email}</strong></p>
                <button onClick={() => { setMode("login"); setForgotSent(false); setEmail(""); }}
                  style={{ fontSize: 13, color: T.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 14, color: T.muted, margin: "0 0 16px" }}>Enter your email and we'll send you a reset link.</p>
                <div style={{ marginBottom: 18 }}>
                  <label style={css.label}>Email</label>
                  <input style={css.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus onKeyDown={e => e.key === "Enter" && submitForgot()} />
                </div>
                <Btn variant="primary" onClick={submitForgot} full size="lg" disabled={forgotLoading || !email}>
                  {forgotLoading ? "Sending…" : "Send reset link →"}
                </Btn>
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <button onClick={() => setMode("login")}
                    style={{ fontSize: 13, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Back to sign in
                  </button>
                </div>
              </>
            )
          ) : (
            <>
              <div style={{ display: "flex", background: T.bg, borderRadius: T.radiusSm, padding: 3, marginBottom: "1.25rem" }}>
                {["login", "register"].map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ flex: 1, padding: "7px", borderRadius: "5px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: mode === m ? T.bgCard : "transparent", color: mode === m ? T.text : T.muted, boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                    {m === "login" ? "Sign in" : "Register"}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={css.label}>Email</label>
                <input style={css.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={css.label}>Password</label>
                <input type="password" style={css.input} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
              {mode === "login" && (
                <div style={{ textAlign: "right", marginBottom: error ? 10 : 18 }}>
                  <button onClick={() => { setMode("forgot"); setPassword(""); }}
                    style={{ fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
                    Forgot password?
                  </button>
                </div>
              )}
              {mode === "register" && <div style={{ marginBottom: error ? 10 : 18 }} />}
              {error && <p style={{ fontSize: 13, color: T.danger, background: T.dangerBg, padding: "8px 12px", borderRadius: T.radiusSm, margin: "0 0 14px" }}>{error}</p>}
              <Btn variant="primary" onClick={submit} full size="lg" disabled={loading}>
                {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── RESET PASSWORD ─────────────────────────────────────────────────────── */
function ResetPasswordPage({ onReset }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    const err = await onReset(password);
    if (err) { setError(err); setLoading(false); }
    else setDone(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "inherit", padding: "1rem" }}>
      <div style={{ width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 52, height: 52, background: T.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🏠</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.03em" }}>HomeTracker</h1>
        </div>
        <div style={{ ...css.card, padding: "1.75rem", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 6px" }}>Password updated</p>
              <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px" }}>You're now signed in with your new password.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 16px" }}>Set a new password</p>
              <div style={{ marginBottom: 12 }}>
                <label style={css.label}>New password</label>
                <input type="password" style={css.input} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoFocus />
              </div>
              <div style={{ marginBottom: error ? 10 : 18 }}>
                <label style={css.label}>Confirm password</label>
                <input type="password" style={css.input} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
              {error && <p style={{ fontSize: 13, color: T.danger, background: T.dangerBg, padding: "8px 12px", borderRadius: T.radiusSm, margin: "0 0 14px" }}>{error}</p>}
              <Btn variant="primary" onClick={submit} full size="lg" disabled={loading}>
                {loading ? "Updating…" : "Update password →"}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── SIDEBAR ───────────────────────────────────────────────────────────── */
function Sidebar({ view, setView, user, onLogout, search, setSearch, searchResults, db, itemLoc }) {
  const nav = [
    { id: "dashboard", icon: "⌂", label: "Houses" },
    { id: "items",     icon: "◫", label: "All items" },
    { id: "activity",  icon: "◷", label: "Activity" },
  ];
  return (
    <div style={{ width: 228, background: T.bgSidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", minHeight: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "1.125rem 1rem 0.75rem", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, background: T.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🏠</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>HomeTracker</span>
        </div>
      </div>

      <div style={{ padding: "0.75rem", position: "relative" }}>
        <div style={{ position: "relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            style={{ ...css.input, fontSize: 13, padding: "7px 10px 7px 30px", background: T.bgCard }} />
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.muted }}>⌕</span>
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, padding: 0, fontFamily: "inherit" }}>×</button>}
        </div>
        {search.trim() && (
          <div style={{ position: "absolute", left: 12, right: 12, top: "100%", zIndex: 200, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            {searchResults.length === 0
              ? <div style={{ padding: 12, fontSize: 13, color: T.muted, textAlign: "center" }}>No results</div>
              : searchResults.slice(0, 6).map(item => (
                <div key={item.id} style={{ padding: "9px 12px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: item.place_id ? T.muted : T.danger, marginTop: 2 }}>{itemLoc(item)}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      <nav style={{ padding: "0.25rem 0.5rem", flex: 1 }}>
        {nav.map(n => {
          const active = view.page === n.id;
          const badge = n.id === "dashboard" && db.invites?.length > 0 ? db.invites.length : null;
          return (
            <button key={n.id} onClick={() => { setView({ page: n.id }); setSearch(""); }}
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: T.radiusSm, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: active ? 600 : 500, background: active ? T.bgCard : "transparent", color: active ? T.accent : T.muted, marginBottom: 2, transition: "all 0.1s", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.07)" : "none" }}>
              <span style={{ fontSize: 15, opacity: active ? 1 : 0.6 }}>{n.icon}</span>
              {n.label}
              {badge && <span style={{ marginLeft: "auto", background: T.accent, color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "0.875rem 1rem", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Avatar email={user.email} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(user.email)}</span>
        </div>
        <Btn onClick={onLogout} full size="sm" style={{ color: T.muted, fontSize: 12 }}>Sign out</Btn>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─────────────────────────────────────────────────────────── */
function DashboardView({ houses, db, user, userItems, userActs, onOpenHouse, onAddHouse, onDeleteHouse, onInvite, onAcceptInvite, onDeclineInvite }) {
  const sectionCount = db.sections.filter(s => houses.some(h => h.id === s.house_id)).length;
  const placeCount = db.places.filter(p => {
    const s = db.sections.find(s => s.id === p.section_id);
    return houses.some(h => h.id === s?.house_id);
  }).length;

  return (
    <div>
      <InviteBanner invites={db.invites || []} onAccept={onAcceptInvite} onDecline={onDeclineInvite} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: T.text, letterSpacing: "-0.03em" }}>My houses</h1>
        <Btn variant="primary" onClick={onAddHouse}>+ Add house</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
        <StatCard label="Houses" value={houses.length} />
        <StatCard label="Sections" value={sectionCount} />
        <StatCard label="Places" value={placeCount} />
        <StatCard label="Items placed" value={userItems.filter(i => i.place_id).length} color={T.accent} />
      </div>

      {houses.length === 0 ? (
        <div style={css.card}>
          <Empty icon="🏠" title="No houses yet" sub="Start by adding your first house — then add rooms, storage spots, and items" action={<Btn variant="primary" onClick={onAddHouse}>+ Add first house</Btn>} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
          {houses.map(house => {
            const sSecs = db.sections.filter(s => s.house_id === house.id);
            const sPlaces = db.places.filter(p => sSecs.some(s => s.id === p.section_id));
            const hItems = userItems.filter(i => sPlaces.some(p => p.id === i.place_id));
            const isOwner = house.user_id === user.id;
            const memberCount = (db.members || []).filter(m => m.house_id === house.id).length;

            return (
              <div key={house.id} onClick={() => onOpenHouse(house.id)}
                style={{ ...css.card, cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s", position: "relative" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>🏠</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {isOwner && (
                      <button onClick={e => { e.stopPropagation(); onInvite(house.id); }}
                        style={{ background: T.accentLight, border: "none", cursor: "pointer", color: T.accentText, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, fontFamily: "inherit" }}
                        title="Invite someone">+ Invite</button>
                    )}
                    {isOwner && (
                      <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${house.name}" and all its contents?`)) onDeleteHouse(house.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, padding: "2px 4px", opacity: 0.4 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}>×</button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{house.name}</div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>{sSecs.length} sections · {sPlaces.length} places · {hItems.length} items</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {!isOwner && <Tag label="Shared with you" color="accent" />}
                  {memberCount > 0 && <Tag label={`${memberCount + 1} members`} color="neutral" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {userActs.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Recent activity</div>
          <div style={css.card}>
            {userActs.slice(0, 5).map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < 4 && i < userActs.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "flex-start" }}>
                <Tag label={a.type} color={a.type === "move" ? "amber" : a.type === "item" ? "green" : "accent"} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmt(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── HOUSE VIEW ────────────────────────────────────────────────────────── */
function HouseView({ house, db, user, userItems, onBack, onOpenSection, onAddSection, onDeleteSection, onInvite, onRemoveMember }) {
  if (!house) return null;
  const sections = db.sections.filter(s => s.house_id === house.id);
  const isOwner = house.user_id === user.id;
  const members = (db.members || []).filter(m => m.house_id === house.id);

  return (
    <div>
      <Crumb items={[{ label: "Houses", onClick: onBack }, { label: house.name }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: T.text, letterSpacing: "-0.03em" }}>{house.name}</h1>
          {!isOwner && <Tag label="Shared with you" color="accent" />}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isOwner && <Btn onClick={onInvite}>+ Invite member</Btn>}
          <Btn variant="primary" onClick={onAddSection}>+ Add section</Btn>
        </div>
      </div>

      {members.length > 0 && (
        <div style={{ ...css.card, marginBottom: "1.25rem" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>Members</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar email={user.email} size={28} />
              <span style={{ fontSize: 13, color: T.text }}>{displayName(user.email)} {isOwner ? <Tag label="owner" color="accent" /> : ""}</span>
            </div>
            {members.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar email={m.user_id} size={28} />
                <span style={{ fontSize: 13, color: T.text }}>{m.user_id.slice(0, 8)}…</span>
                {isOwner && (
                  <button onClick={() => { if (window.confirm("Remove this member?")) onRemoveMember(house.id, m.user_id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 2px", fontFamily: "inherit", opacity: 0.5 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sections.length === 0 ? (
        <div style={css.card}><Empty icon="🚪" title="No sections yet" sub="Add rooms or areas like Bedroom, Kitchen, Garage" action={<Btn variant="primary" onClick={onAddSection}>+ Add section</Btn>} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
          {sections.map(sec => {
            const places = db.places.filter(p => p.section_id === sec.id);
            const items = userItems.filter(i => places.some(p => p.id === i.place_id));
            return (
              <div key={sec.id} onClick={() => onOpenSection(sec.id)}
                style={{ ...css.card, cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 10 }}>🚪</div>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete section "${sec.name}"?`)) onDeleteSection(sec.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 15, padding: "2px", opacity: 0.4 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}>×</button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 5 }}>{sec.name}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Tag label={`${places.length} places`} />
                  <Tag label={`${items.length} items`} color={items.length > 0 ? "green" : "neutral"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── SECTION VIEW ──────────────────────────────────────────────────────── */
function SectionView({ view, db, userItems, onGoHouse, onOpenPlace, onAddPlace, onDeletePlace }) {
  const section = db.sections.find(s => s.id === view.sectionId);
  const house = db.houses.find(h => h.id === view.houseId);
  if (!section) return null;
  const places = db.places.filter(p => p.section_id === section.id);
  return (
    <div>
      <Crumb items={[{ label: "Houses", onClick: () => onGoHouse(null) }, { label: house?.name, onClick: () => onGoHouse(house?.id) }, { label: section.name }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: T.text, letterSpacing: "-0.03em" }}>{section.name}</h1>
        <Btn variant="primary" onClick={onAddPlace}>+ Add place</Btn>
      </div>
      {places.length === 0 ? (
        <div style={css.card}><Empty icon="📦" title="No places yet" sub="Add specific storage spots like Closet, Top drawer, Shelf B" action={<Btn variant="primary" onClick={onAddPlace}>+ Add place</Btn>} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {places.map(place => {
            const cnt = userItems.filter(i => i.place_id === place.id).length;
            return (
              <div key={place.id} onClick={() => onOpenPlace(place.id)}
                style={{ ...css.card, cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: T.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 10 }}>📦</div>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete place "${place.name}"?`)) onDeletePlace(place.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 15, padding: "2px", opacity: 0.4 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}>×</button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{place.name}</div>
                <Tag label={`${cnt} item${cnt !== 1 ? "s" : ""}`} color={cnt > 0 ? "green" : "neutral"} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── PLACE VIEW ────────────────────────────────────────────────────────── */
function PlaceView({ view, db, userItems, onGoHouse, onGoSection, onMoveItem, onRemoveItem }) {
  const place = db.places.find(p => p.id === view.placeId);
  const section = db.sections.find(s => s.id === view.sectionId);
  const house = db.houses.find(h => h.id === view.houseId);
  if (!place) return null;
  const items = userItems.filter(i => i.place_id === view.placeId);
  return (
    <div>
      <Crumb items={[{ label: "Houses", onClick: () => onGoHouse(null) }, { label: house?.name, onClick: () => onGoHouse(house?.id) }, { label: section?.name, onClick: onGoSection }, { label: place.name }]} />
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: T.text, letterSpacing: "-0.03em" }}>{place.name}</h1>
        <div style={{ fontSize: 13, color: T.muted }}>{house?.name} › {section?.name} › {place.name}</div>
      </div>
      <div style={css.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Contents <span style={{ fontWeight: 400, color: T.muted, fontSize: 13 }}>({items.length} item{items.length !== 1 ? "s" : ""})</span></span>
          <Btn variant="subtle" size="sm" onClick={() => onMoveItem(null)}>+ Move item here</Btn>
        </div>
        {items.length === 0
          ? <Empty icon="○" title="Nothing stored here yet" sub="Use 'Place / Move' on any item to assign it here" />
          : items.map((item, i) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{item.name}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <Btn size="sm" onClick={() => onMoveItem(item.id)}>Move</Btn>
                <Btn size="sm" variant="danger" onClick={() => onRemoveItem(item.id)}>Remove</Btn>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ─── ITEMS VIEW ────────────────────────────────────────────────────────── */
function ItemsView({ userItems, db, itemLoc, onAddItem, onMoveItem, onDeleteItem }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "placed" ? userItems.filter(i => i.place_id) : filter === "unplaced" ? userItems.filter(i => !i.place_id) : userItems;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: T.text, letterSpacing: "-0.03em" }}>All items</h1>
        <Btn variant="primary" onClick={onAddItem}>+ Add item</Btn>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: "1.125rem" }}>
        {[["all", "All"], ["placed", "Placed"], ["unplaced", "Unplaced"]].map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, background: filter === f ? T.accent : T.bgCard, color: filter === f ? "#fff" : T.muted, boxShadow: `0 0 0 1px ${T.border}`, transition: "all 0.12s" }}>
            {l}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: T.muted, alignSelf: "center" }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      {filtered.length === 0 ? (
        <div style={css.card}>
          <Empty icon="◫" title={filter === "unplaced" ? "All items are placed!" : "No items yet"} sub={filter === "all" ? "Add items like 'car spare keys', then assign them to a specific place" : undefined} action={filter === "all" ? <Btn variant="primary" onClick={onAddItem}>+ Add first item</Btn> : undefined} />
        </div>
      ) : (
        <div style={css.card}>
          {filtered.map((item, i) => {
            const loc = itemLoc(item);
            const placed = !!item.place_id;
            return (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 3 }}>{item.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: placed ? T.success : T.danger, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: placed ? T.muted : T.danger }}>{loc}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" onClick={() => onMoveItem(item.id)}>Place / Move</Btn>
                  <Btn size="sm" variant="danger" onClick={() => { if (window.confirm(`Delete "${item.name}"?`)) onDeleteItem(item.id); }}>Delete</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── ACTIVITY VIEW ─────────────────────────────────────────────────────── */
function ActivityView({ acts }) {
  const colorMap = { house: "accent", section: "accent", place: "accent", item: "green", move: "amber" };
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 1.25rem", color: T.text, letterSpacing: "-0.03em" }}>Activity log</h1>
      {acts.length === 0
        ? <div style={css.card}><Empty icon="◷" title="No activity yet" sub="Start creating houses and placing items" /></div>
        : <div style={css.card}>
            {acts.map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < acts.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "flex-start" }}>
                <Tag label={a.type} color={colorMap[a.type] || "neutral"} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmt(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

/* ─── APP ────────────────────────────────────────────────────────────────── */
export default function App() {
  const [db, setDb] = useState(emptyDb());
  const [user, setUser] = useState(null);
  const [view, setView] = useState({ page: "dashboard" });
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [appLoading, setAppLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "error" });

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "error" }), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const data = await api.getData();
      setDb(data);
    } catch (e) { showToast("Failed to load data: " + e.message); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadData(); }
      setAppLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { setUser(session.user); setResetMode(true); }
      else if (event === "SIGNED_IN" && session) { setUser(session.user); loadData(); }
      if (event === "SIGNED_OUT") { setUser(null); setDb(emptyDb()); setView({ page: "dashboard" }); setResetMode(false); }
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  const doLogin = async (email, password) => {
    setAuthLoading(true); setAuthErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthErr(error.message);
    setAuthLoading(false);
  };
  const doRegister = async (email, password) => {
    setAuthLoading(true); setAuthErr("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthErr(error.message);
    setAuthLoading(false);
  };
  const doLogout = () => supabase.auth.signOut();
  const doForgotPassword = async (email) => {
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  };
  const doResetPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    setResetMode(false);
    loadData();
    return null;
  };

  const logAct = (type, desc) => api.logActivity(type, desc).then(act =>
    setDb(prev => ({ ...prev, acts: [act, ...prev.acts].slice(0, 300) }))).catch(() => {});

  const addHouse = async (name) => {
    const house = await api.addHouse(name);
    setDb(prev => ({ ...prev, houses: [...prev.houses, house] }));
    logAct("house", `Created house "${name}"`);
  };
  const delHouse = async (id) => {
    const name = db.houses.find(h => h.id === id)?.name;
    await api.deleteHouse(id);
    const sIds = db.sections.filter(s => s.house_id === id).map(s => s.id);
    const pIds = db.places.filter(p => sIds.includes(p.section_id)).map(p => p.id);
    setDb(prev => ({ ...prev, houses: prev.houses.filter(h => h.id !== id), sections: prev.sections.filter(s => s.house_id !== id), places: prev.places.filter(p => !sIds.includes(p.section_id)), items: prev.items.map(i => pIds.includes(i.place_id) ? { ...i, place_id: null } : i) }));
    if (view.houseId === id) setView({ page: "dashboard" });
    logAct("house", `Deleted house "${name}"`);
  };
  const addSection = async (house_id, name) => {
    const section = await api.addSection(house_id, name);
    setDb(prev => ({ ...prev, sections: [...prev.sections, section] }));
    logAct("section", `Added section "${name}"`);
  };
  const delSection = async (id) => {
    const sec = db.sections.find(s => s.id === id);
    await api.deleteSection(id);
    const pIds = db.places.filter(p => p.section_id === id).map(p => p.id);
    setDb(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id), places: prev.places.filter(p => p.section_id !== id), items: prev.items.map(i => pIds.includes(i.place_id) ? { ...i, place_id: null } : i) }));
    if (view.sectionId === id) setView({ page: "house", houseId: sec?.house_id });
    logAct("section", `Deleted section "${sec?.name}"`);
  };
  const addPlace = async (section_id, name) => {
    const place = await api.addPlace(section_id, name);
    setDb(prev => ({ ...prev, places: [...prev.places, place] }));
    logAct("place", `Added place "${name}"`);
  };
  const delPlace = async (id) => {
    const place = db.places.find(p => p.id === id);
    await api.deletePlace(id);
    setDb(prev => ({ ...prev, places: prev.places.filter(p => p.id !== id), items: prev.items.map(i => i.place_id === id ? { ...i, place_id: null } : i) }));
    if (view.placeId === id) setView({ page: "section", sectionId: place?.section_id, houseId: view.houseId });
    logAct("place", `Deleted place "${place?.name}"`);
  };
  const addItem = async (name) => {
    const item = await api.addItem(name);
    setDb(prev => ({ ...prev, items: [...prev.items, item] }));
    logAct("item", `Added item "${name}"`);
  };
  const moveItem = async (itemId, place_id) => {
    const item = db.items.find(i => i.id === itemId);
    if (!item) return;
    await api.moveItem(itemId, place_id);
    setDb(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, place_id } : i) }));
    const fromName = item.place_id ? db.places.find(p => p.id === item.place_id)?.name : null;
    const toName = place_id ? db.places.find(p => p.id === place_id)?.name : "unassigned";
    logAct("move", fromName ? `Moved "${item.name}" from "${fromName}" to "${toName}"` : `Placed "${item.name}" in "${toName}"`);
  };
  const delItem = async (id) => {
    const name = db.items.find(i => i.id === id)?.name;
    await api.deleteItem(id);
    setDb(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
    logAct("item", `Deleted item "${name}"`);
  };

  const sendInvite = async (house_id, invited_email) => {
    await api.sendInvite(house_id, invited_email);
    showToast(`Invite sent to ${invited_email}`, "success");
    logAct("invite", `Invited ${invited_email} to join a house`);
  };

  const acceptInvite = async (inv) => {
    await api.respondInvite(inv.id, "accepted");
    setDb(prev => ({ ...prev, invites: prev.invites.filter(i => i.id !== inv.id) }));
    showToast(`You joined "${inv.house_name}"!`, "success");
    loadData();
  };

  const declineInvite = async (inv) => {
    await api.respondInvite(inv.id, "declined");
    setDb(prev => ({ ...prev, invites: prev.invites.filter(i => i.id !== inv.id) }));
  };

  const removeMember = async (house_id, member_user_id) => {
    await api.removeMember(house_id, member_user_id);
    setDb(prev => ({ ...prev, members: prev.members.filter(m => !(m.house_id === house_id && m.user_id === member_user_id)) }));
    showToast("Member removed", "success");
  };

  const itemLoc = useCallback((item) => {
    if (!item?.place_id) return "Not placed";
    const place = db.places.find(p => p.id === item.place_id);
    const sec = place ? db.sections.find(s => s.id === place.section_id) : null;
    const house = sec ? db.houses.find(h => h.id === sec.house_id) : null;
    return [house?.name, sec?.name, place?.name].filter(Boolean).join(" › ");
  }, [db]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return db.items.filter(i => i.name.toLowerCase().includes(q));
  }, [search, db]);

  const fns = { addHouse, addSection, addPlace, addItem, moveItem, sendInvite, showToast };

  if (appLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: T.muted, fontFamily: "-apple-system, sans-serif", fontSize: 14 }}>Loading…</div>
  );
  if (!user) return <AuthPage onLogin={doLogin} onRegister={doRegister} onForgotPassword={doForgotPassword} error={authErr} loading={authLoading} />;
  if (resetMode) return <ResetPasswordPage onReset={doResetPassword} />;

  const renderView = () => {
    const { page } = view;
    if (page === "dashboard") return <DashboardView houses={db.houses} db={db} user={user} userItems={db.items} userActs={db.acts} onOpenHouse={id => setView({ page: "house", houseId: id })} onAddHouse={() => setModal({ type: "add_house" })} onDeleteHouse={delHouse} onInvite={hid => setModal({ type: "invite_member", houseId: hid })} onAcceptInvite={acceptInvite} onDeclineInvite={declineInvite} />;
    if (page === "house")     return <HouseView house={db.houses.find(h => h.id === view.houseId)} db={db} user={user} userItems={db.items} onBack={() => setView({ page: "dashboard" })} onOpenSection={id => setView({ page: "section", sectionId: id, houseId: view.houseId })} onAddSection={() => setModal({ type: "add_section", houseId: view.houseId })} onDeleteSection={delSection} onInvite={() => setModal({ type: "invite_member", houseId: view.houseId })} onRemoveMember={removeMember} />;
    if (page === "section")   return <SectionView view={view} db={db} userItems={db.items} onGoHouse={id => id ? setView({ page: "house", houseId: id }) : setView({ page: "dashboard" })} onOpenPlace={id => setView({ page: "place", placeId: id, sectionId: view.sectionId, houseId: view.houseId })} onAddPlace={() => setModal({ type: "add_place", sectionId: view.sectionId })} onDeletePlace={delPlace} />;
    if (page === "place")     return <PlaceView view={view} db={db} userItems={db.items} onGoHouse={id => id ? setView({ page: "house", houseId: id }) : setView({ page: "dashboard" })} onGoSection={() => setView({ page: "section", sectionId: view.sectionId, houseId: view.houseId })} onMoveItem={iid => setModal({ type: "move_item", itemId: iid, targetPlaceId: view.placeId })} onRemoveItem={iid => moveItem(iid, null)} />;
    if (page === "items")     return <ItemsView userItems={db.items} db={db} itemLoc={itemLoc} onAddItem={() => setModal({ type: "add_item" })} onMoveItem={iid => setModal({ type: "move_item", itemId: iid })} onDeleteItem={delItem} />;
    if (page === "activity")  return <ActivityView acts={db.acts} />;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Sidebar view={view} setView={setView} user={user} onLogout={doLogout} search={search} setSearch={setSearch} searchResults={searchResults} db={db} itemLoc={itemLoc} />
      <main style={{ flex: 1, padding: "1.75rem 2rem", minWidth: 0, overflowX: "hidden" }}>
        {renderView()}
      </main>
      {modal && <Modal modal={modal} onClose={() => setModal(null)} db={db} allPlaces={db.places} fns={fns} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
