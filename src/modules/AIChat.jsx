import { C } from '../utils/constants';

export default function AIChat({ chatMsgs, chatInput, setChatInput, chatLoading, sendChat }) {
  return <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", maxHeight: 600 }}>
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
      {!chatMsgs.length && <div style={{ textAlign: "center", padding: 40, color: C.t3 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, marginBottom: 4 }}>Kattegat AI</div>
        <div style={{ fontSize: 12, marginBottom: 16 }}>Pregúntame sobre tu negocio, producción, costos, clientes...</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {["¿Cuántas OTs tengo activas?","¿Cuál es mi cliente más grande?","¿Qué resinas tengo en inventario?","Resumen general del negocio"].map((q,i) => (
            <button key={i} onClick={() => { setChatInput(q); }} style={{ background: `${C.acc}15`, border: `1px solid ${C.acc}30`, color: C.acc, fontSize: 11, padding: "6px 12px", borderRadius: 20, cursor: "pointer" }}>{q}</button>
          ))}
        </div>
      </div>}
      {chatMsgs.map((m, i) => (
        <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8, padding: "0 4px" }}>
          <div style={{
            maxWidth: "85%", padding: "10px 14px", borderRadius: 16,
            background: m.role === "user" ? C.acc : C.s1,
            color: m.role === "user" ? "#fff" : C.t1,
            fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
            borderBottomRightRadius: m.role === "user" ? 4 : 16,
            borderBottomLeftRadius: m.role === "ai" ? 4 : 16,
          }}>
            {m.role === "ai" && <div style={{ fontSize: 10, color: C.acc, fontWeight: 700, marginBottom: 4 }}>🤖 Kattegat AI</div>}
            {m.text}
          </div>
        </div>
      ))}
      {chatLoading && <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8, padding: "0 4px" }}>
        <div style={{ background: C.s1, padding: "10px 14px", borderRadius: 16, borderBottomLeftRadius: 4, fontSize: 13, color: C.t3 }}>
          <span style={{ fontSize: 10, color: C.acc, fontWeight: 700 }}>🤖 Kattegat AI</span><br/>Pensando...
        </div>
      </div>}
    </div>
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderTop: `1px solid ${C.brd}` }}>
      <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
        placeholder="Pregúntale a Kattegat AI..." style={{ flex: 1, background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 24, color: C.t1, padding: "10px 16px", fontSize: 13, outline: "none" }} />
      <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
        style={{ background: C.acc, border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>➤</button>
    </div>
  </div>;
}
