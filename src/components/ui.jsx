import { useState } from 'react';
import { C } from '../utils/constants';

// ─── FORM INPUTS ───
export const Inp = ({ v, set, pre, ph }) => (
  <div style={{ display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, padding: "6px 8px" }}>
    {pre && <span style={{ color: C.t3, fontSize: 11, marginRight: 4 }}>{pre}</span>}
    <input value={v} onChange={e => set(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={ph}
      style={{ background: "transparent", border: "none", color: C.t1, fontSize: 13, fontFamily: "monospace", width: "100%", outline: "none" }} />
  </div>
);

export const TxtInp = ({ v, set, ph }) => (
  <input value={v} onChange={e => set(e.target.value)} placeholder={ph}
    style={{ width: "100%", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, color: C.t1, padding: "6px 8px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
);

export const DateInp = ({ v, set }) => (
  <input type="date" value={v} onChange={e => set(e.target.value)}
    style={{ width: "100%", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, color: C.t1, padding: "6px 8px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
);

export const Sel = ({ v, set, opts, ph }) => (
  <select value={v} onChange={e => set(e.target.value)}
    style={{ width: "100%", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, color: C.t1, padding: "6px 8px", fontSize: 12, outline: "none", appearance: "auto" }}>
    {ph && <option value="">{ph}</option>}
    {(opts || []).map(o => typeof o === "object" ? <option key={o.v} value={o.v}>{o.l}</option> : <option key={o} value={o}>{o}</option>)}
  </select>
);

// ─── LAYOUT HELPERS ───
export const F = ({ l, u, w, ch, h }) => (
  <div style={{ width: w || "100%", marginBottom: 6 }}>
    <div style={{ fontSize: 10, color: C.t3, marginBottom: 2 }}>{l} {u && <span style={{ fontSize: 9, color: C.brd }}>({u})</span>}</div>
    {ch}
    {h && <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>{h}</div>}
  </div>
);

export const R = ({ ch }) => <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>{ch}</div>;

export const RR = ({ l, v, b, sm, c }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: `${sm ? 2 : 4}px 0`, fontSize: sm ? 10 : 12 }}>
    <span style={{ color: C.t3 }}>{l}</span>
    <span style={{ fontWeight: b ? 800 : 600, fontFamily: "monospace", color: c || C.t1 }}>{typeof v === "number" ? `$${Number(v).toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : v}</span>
  </div>
);

// ─── SECTIONS ───
export const Sec = ({ t, ico, ch, col, right }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {ico && <span style={{ fontSize: 14 }}>{ico}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, color: col || C.t1 }}>{t}</span>
      </div>
      {right}
    </div>
    <div style={{ background: C.s2, borderRadius: 10, padding: 12, border: `1px solid ${C.brd}` }}>{ch}</div>
  </div>
);

export const Badge = ({ text, color }) => (
  <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}20`, padding: "1px 6px", borderRadius: 4 }}>{text}</span>
);

export const Btn = ({ text, ico, color, onClick, sm, full, outline, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: outline ? "transparent" : color || C.acc,
    color: outline ? color : "#fff",
    border: outline ? `1px solid ${color || C.acc}` : "none",
    padding: sm ? "4px 10px" : "10px 16px",
    borderRadius: 8, fontWeight: 700,
    fontSize: sm ? 10 : 12,
    cursor: disabled ? "default" : "pointer",
    width: full ? "100%" : "auto",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    opacity: disabled ? 0.5 : 1,
  }}>{ico}{text}</button>
);

export const Tab = ({ tabs, active, set }) => (
  <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.brd}`, paddingBottom: 6 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => set(t.id)} style={{
        padding: "5px 10px", borderRadius: "6px 6px 0 0", border: "none",
        background: active === t.id ? `${C.acc}15` : "transparent",
        color: active === t.id ? C.acc : C.t3,
        borderBottom: active === t.id ? `2px solid ${C.acc}` : "2px solid transparent",
        fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
      }}><span>{t.ico}</span>{t.l}</button>
    ))}
  </div>
);

export const Modal = ({ title, onClose, ch }) => (
  <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.s1, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto", padding: 16, animation: "slideIn 0.2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.t3, fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      {ch}
    </div>
  </div>
);

export const Card = ({ v, l, s, c, ico }) => (
  <div style={{ background: C.s2, borderRadius: 10, padding: 12, border: `1px solid ${C.brd}`, textAlign: "center" }}>
    <div style={{ fontSize: 10, color: C.t3 }}>{ico} {l}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: c || C.acc, fontFamily: "monospace" }}>{v}</div>
    {s && <div style={{ fontSize: 10, color: C.t3 }}>{s}</div>}
  </div>
);

export const Loading = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${C.acc}, ${C.pur})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 12 }}>K</div>
    <div style={{ color: C.t3, fontSize: 12 }}>Cargando Kattegat...</div>
  </div>
);
