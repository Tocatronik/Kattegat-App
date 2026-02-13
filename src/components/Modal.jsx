export const Modal = ({ title, onClose, ch }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
    <div style={{ background: "#1A2236", borderRadius: 12, border: "1px solid #2A3550", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #2A3550", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#1A2236" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ padding: 16 }}>{ch}</div>
    </div>
  </div>
);
