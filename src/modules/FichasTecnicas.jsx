import { C } from '../utils/constants';
import { Inp, TxtInp, Sel, F, R, Sec, Badge, Btn, Tab, Modal } from '../components/ui';

export default function FichasTecnicas({
  fichaTab, setFichaTab, fichasResinas, fichasPapeles, bobinas,
  expandedFicha, setExpandedFicha,
  showAddFicha, setShowAddFicha, editFicha, setEditFicha,
  newFichaR, setNewFichaR, newFichaP, setNewFichaP,
  addFichaResina, addFichaPapel, deleteFicha,
  generateTDSPdf, generateCoCPdf,
  pdfInputRef, parsingPDF, parseTDSFromPDF, proveedores,
}) {
  return <>
    <Tab tabs={[{ id: "resinas", ico: "🧪", l: "Resinas" }, { id: "papeles", ico: "📜", l: "Papeles" }, { id: "coc", ico: "✅", l: "Certificados" }]} active={fichaTab} set={setFichaTab} />

    {/* Hidden file input for PDF upload */}
    <input type="file" accept=".pdf" ref={pdfInputRef} style={{ display: "none" }} onChange={e => {
      const file = e.target.files?.[0];
      if (file) { parseTDSFromPDF(file, fichaTab === "papeles" ? "papel" : "resina"); }
      e.target.value = "";
    }} />

    {parsingPDF && (
      <div style={{ padding: 16, background: `${C.pur}15`, borderRadius: 10, border: `1px solid ${C.pur}40`, marginTop: 12, textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 8, animation: "pulse 1.5s infinite" }}>🤖</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.pur }}>AI analizando PDF...</div>
        <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>Extrayendo datos técnicos automáticamente</div>
      </div>
    )}

    <div style={{ marginTop: 12 }}>
      {fichaTab === "resinas" && <>
        <Sec t={`Fichas Resinas (${fichasResinas.length})`} ico="🧪"
          right={<div style={{display:"flex",gap:4}}>
            <Btn text="📎 Subir PDF" sm color={C.pur} onClick={() => pdfInputRef.current?.click()} disabled={parsingPDF} />
            <Btn text="+ Manual" sm color={C.grn} onClick={() => {
              setEditFicha(null); setFichaTab("resinas");
              setNewFichaR({ nombre: "", grado: "", fabricante: "", tipo_polimero: "PEBD", mfi: "", densidad: "", punto_fusion: "", temp_min: "", temp_max: "", resistencia_tension: "", elongacion: "", dureza: "", norma: "ASTM D1238", notas: "" });
              setShowAddFicha(true);
            }} />
          </div>}
          ch={<>
            {!fichasResinas.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>🧪 Sin fichas de resinas. Agrega la primera con datos del fabricante.</div> :
              fichasResinas.map((f, i) => (
                <div key={f.id||i} style={{ padding: 10, background: C.bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${expandedFicha === f.id ? C.acc : C.brd}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setExpandedFicha(expandedFicha === f.id ? null : f.id)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{f.nombre}</div>
                      <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                        {f.fabricante && <span style={{marginRight:10}}>🏭 {f.fabricante}</span>}
                        {f.grado && <span style={{marginRight:10}}>📋 {f.grado}</span>}
                        <Badge text={f.tipo_polimero || "PE"} color={C.acc} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={e => { e.stopPropagation(); generateTDSPdf(f, "resina"); }} style={{ background: "none", border: "none", color: C.pur, cursor: "pointer", fontSize: 13 }} title="Descargar PDF">📄</button>
                      <button onClick={e => { e.stopPropagation(); setEditFicha(f); setNewFichaR({...f}); setFichaTab("resinas"); setShowAddFicha(true); }} style={{ background: "none", border: "none", color: C.acc, cursor: "pointer", fontSize: 13 }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); deleteFicha(f.id, "resina"); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}>🗑️</button>
                      <span style={{ color: C.t3, fontSize: 10 }}>{expandedFicha === f.id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {expandedFicha === f.id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.brd}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                      {f.mfi && <div style={{fontSize:11}}><span style={{color:C.t3}}>MFI:</span> <span style={{color:C.t1}}>{f.mfi} g/10min</span></div>}
                      {f.densidad && <div style={{fontSize:11}}><span style={{color:C.t3}}>Densidad:</span> <span style={{color:C.t1}}>{f.densidad} g/cm³</span></div>}
                      {f.punto_fusion && <div style={{fontSize:11}}><span style={{color:C.t3}}>Punto fusión:</span> <span style={{color:C.t1}}>{f.punto_fusion}°C</span></div>}
                      {f.dureza && <div style={{fontSize:11}}><span style={{color:C.t3}}>Dureza:</span> <span style={{color:C.t1}}>{f.dureza}</span></div>}
                      {f.resistencia_tension && <div style={{fontSize:11}}><span style={{color:C.t3}}>Tensión:</span> <span style={{color:C.t1}}>{f.resistencia_tension} MPa</span></div>}
                      {f.elongacion && <div style={{fontSize:11}}><span style={{color:C.t3}}>Elongación:</span> <span style={{color:C.t1}}>{f.elongacion}%</span></div>}
                      {(f.temp_min || f.temp_max) && <div style={{fontSize:11}}><span style={{color:C.t3}}>Temp proceso:</span> <span style={{color:C.t1}}>{f.temp_min}-{f.temp_max}°C</span></div>}
                      {f.norma && <div style={{fontSize:11}}><span style={{color:C.t3}}>Norma:</span> <span style={{color:C.acc}}>{f.norma}</span></div>}
                      {f.notas && <div style={{fontSize:11,gridColumn:"1/-1",marginTop:4,fontStyle:"italic",color:C.t3}}>📝 {f.notas}</div>}
                    </div>
                  )}
                </div>
              ))}
          </>} />
      </>}

      {fichaTab === "papeles" && <>
        <Sec t={`Fichas Papeles (${fichasPapeles.length})`} ico="📜"
          right={<div style={{display:"flex",gap:4}}>
            <Btn text="📎 Subir PDF" sm color={C.pur} onClick={() => pdfInputRef.current?.click()} disabled={parsingPDF} />
            <Btn text="+ Manual" sm color={C.grn} onClick={() => {
              setEditFicha(null); setFichaTab("papeles");
              setNewFichaP({ nombre: "", proveedor: "", tipo: "Bond", gramaje: "", brightness: "", opacidad: "", humedad: "", espesor: "", resistencia_tension: "", resistencia_rasgado: "", porosidad: "", norma: "", notas: "" });
              setShowAddFicha(true);
            }} />
          </div>}
          ch={<>
            {!fichasPapeles.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>📜 Sin fichas de papeles. Agrega la primera con datos del proveedor.</div> :
              fichasPapeles.map((f, i) => (
                <div key={f.id||i} style={{ padding: 10, background: C.bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${expandedFicha === f.id ? C.amb : C.brd}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setExpandedFicha(expandedFicha === f.id ? null : f.id)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{f.nombre}</div>
                      <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                        {f.proveedor && <span style={{marginRight:10}}>🏢 {f.proveedor}</span>}
                        {f.gramaje && <span style={{marginRight:10}}>{f.gramaje}g/m²</span>}
                        <Badge text={f.tipo || "Papel"} color={C.amb} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={e => { e.stopPropagation(); generateTDSPdf(f, "papel"); }} style={{ background: "none", border: "none", color: C.pur, cursor: "pointer", fontSize: 13 }} title="Descargar PDF">📄</button>
                      <button onClick={e => { e.stopPropagation(); setEditFicha(f); setNewFichaP({...f}); setFichaTab("papeles"); setShowAddFicha(true); }} style={{ background: "none", border: "none", color: C.acc, cursor: "pointer", fontSize: 13 }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); deleteFicha(f.id, "papel"); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}>🗑️</button>
                      <span style={{ color: C.t3, fontSize: 10 }}>{expandedFicha === f.id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {expandedFicha === f.id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.brd}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                      {f.gramaje && <div style={{fontSize:11}}><span style={{color:C.t3}}>Gramaje:</span> <span style={{color:C.t1}}>{f.gramaje} g/m²</span></div>}
                      {f.espesor && <div style={{fontSize:11}}><span style={{color:C.t3}}>Espesor:</span> <span style={{color:C.t1}}>{f.espesor} μm</span></div>}
                      {f.brightness && <div style={{fontSize:11}}><span style={{color:C.t3}}>Brightness:</span> <span style={{color:C.t1}}>{f.brightness}%</span></div>}
                      {f.opacidad && <div style={{fontSize:11}}><span style={{color:C.t3}}>Opacidad:</span> <span style={{color:C.t1}}>{f.opacidad}%</span></div>}
                      {f.humedad && <div style={{fontSize:11}}><span style={{color:C.t3}}>Humedad:</span> <span style={{color:C.t1}}>{f.humedad}%</span></div>}
                      {f.resistencia_tension && <div style={{fontSize:11}}><span style={{color:C.t3}}>Tensión:</span> <span style={{color:C.t1}}>{f.resistencia_tension} kN/m</span></div>}
                      {f.resistencia_rasgado && <div style={{fontSize:11}}><span style={{color:C.t3}}>Rasgado:</span> <span style={{color:C.t1}}>{f.resistencia_rasgado} mN</span></div>}
                      {f.porosidad && <div style={{fontSize:11}}><span style={{color:C.t3}}>Porosidad:</span> <span style={{color:C.t1}}>{f.porosidad} s/100ml</span></div>}
                      {f.norma && <div style={{fontSize:11}}><span style={{color:C.t3}}>Norma:</span> <span style={{color:C.acc}}>{f.norma}</span></div>}
                      {f.notas && <div style={{fontSize:11,gridColumn:"1/-1",marginTop:4,fontStyle:"italic",color:C.t3}}>📝 {f.notas}</div>}
                    </div>
                  )}
                </div>
              ))}
          </>} />
      </>}

      {fichaTab === "coc" && <>
        <Sec t="Certificados de Calidad (CoC)" ico="✅" ch={<>
          <div style={{ textAlign: "center", padding: 16, color: C.t2, fontSize: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, color: C.t1, marginBottom: 8 }}>Generar desde Producción</div>
            <div>Los Certificados de Calidad se generan desde la pestaña de <b style={{color: C.grn}}>Producción</b> → cualquier bobina con trazabilidad.</div>
            <div style={{ marginTop: 8, fontSize: 11 }}>Busca el botón <Badge text="CoC" color={C.grn} /> junto a cada bobina.</div>
          </div>
          {bobinas.filter(b => b.trazabilidad || b.lote).length > 0 && <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, marginTop: 12, marginBottom: 8 }}>Últimas bobinas con trazabilidad:</div>
            {bobinas.filter(b => b.trazabilidad || b.lote).slice(0, 10).map((b, i) => {
              const traz = typeof b.trazabilidad === 'string' ? JSON.parse(b.trazabilidad || '{}') : (b.trazabilidad || {});
              return (
                <div key={b.id||i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}` }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{b.codigo}</span>
                    <span style={{ fontSize: 11, color: C.t3, marginLeft: 8 }}>{b.lote || traz.lote || "—"}</span>
                    <span style={{ fontSize: 11, color: C.acc, marginLeft: 8 }}>{traz.cliente || ""}</span>
                  </div>
                  <Btn text="CoC PDF" sm color={C.grn} onClick={() => generateCoCPdf(b)} />
                </div>
              );
            })}
          </>}
        </>} />
      </>}
    </div>

    {/* Modal agregar/editar ficha resina */}
    {showAddFicha && fichaTab === "resinas" && <Modal title={editFicha ? "✏️ Editar Ficha Resina" : "+ Ficha Técnica Resina"} onClose={() => { setShowAddFicha(false); setEditFicha(null); }} ch={<>
      <div style={{ fontSize: 10, color: C.acc, marginBottom: 8, padding: "6px 10px", background: `${C.acc}10`, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>💡 La ficha de resina es por grado del fabricante — misma sin importar distribuidor.</span>
        <button onClick={() => pdfInputRef.current?.click()} disabled={parsingPDF} style={{ background: C.pur, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>
          {parsingPDF ? "⏳ Analizando..." : "📎 Cargar PDF"}
        </button>
      </div>
      <R ch={<><F l="Nombre Producto *" w="58%" ch={<TxtInp v={newFichaR.nombre} set={v => setNewFichaR(p => ({...p, nombre: v}))} ph="Ej: PEBD 722 Dow" />} /><F l="Tipo Polímero" w="38%" ch={<Sel v={newFichaR.tipo_polimero} set={v => setNewFichaR(p => ({...p, tipo_polimero: v}))} opts={["PEBD", "PEAD", "PELBD", "PP", "Ionómero", "EVA", "Supreme"]} />} /></>} />
      <R ch={<><F l="Grado/Grade" w="48%" ch={<TxtInp v={newFichaR.grado} set={v => setNewFichaR(p => ({...p, grado: v}))} ph="Ej: 722, 7004" />} /><F l="Fabricante" w="48%" ch={<TxtInp v={newFichaR.fabricante} set={v => setNewFichaR(p => ({...p, fabricante: v}))} ph="Ej: Dow, Braskem" />} /></>} />
      <div style={{ fontSize: 10, fontWeight: 700, color: C.pur, marginTop: 8, marginBottom: 4 }}>PROPIEDADES FÍSICAS</div>
      <R ch={<><F l="MFI" w="31%" u="g/10min" ch={<Inp v={newFichaR.mfi} set={v => setNewFichaR(p => ({...p, mfi: v}))} ph="2.0" />} /><F l="Densidad" w="31%" u="g/cm³" ch={<Inp v={newFichaR.densidad} set={v => setNewFichaR(p => ({...p, densidad: v}))} ph="0.922" />} /><F l="Punto Fusión" w="31%" u="°C" ch={<Inp v={newFichaR.punto_fusion} set={v => setNewFichaR(p => ({...p, punto_fusion: v}))} ph="110" />} /></>} />
      <div style={{ fontSize: 10, fontWeight: 700, color: C.pur, marginTop: 8, marginBottom: 4 }}>PROPIEDADES MECÁNICAS</div>
      <R ch={<><F l="Resist. Tensión" w="31%" u="MPa" ch={<Inp v={newFichaR.resistencia_tension} set={v => setNewFichaR(p => ({...p, resistencia_tension: v}))} ph="10" />} /><F l="Elongación" w="31%" u="%" ch={<Inp v={newFichaR.elongacion} set={v => setNewFichaR(p => ({...p, elongacion: v}))} ph="400" />} /><F l="Dureza" w="31%" u="Shore" ch={<TxtInp v={newFichaR.dureza} set={v => setNewFichaR(p => ({...p, dureza: v}))} ph="D50" />} /></>} />
      <div style={{ fontSize: 10, fontWeight: 700, color: C.pur, marginTop: 8, marginBottom: 4 }}>PROCESAMIENTO</div>
      <R ch={<><F l="Temp. Mín" w="31%" u="°C" ch={<Inp v={newFichaR.temp_min} set={v => setNewFichaR(p => ({...p, temp_min: v}))} ph="160" />} /><F l="Temp. Máx" w="31%" u="°C" ch={<Inp v={newFichaR.temp_max} set={v => setNewFichaR(p => ({...p, temp_max: v}))} ph="220" />} /><F l="Norma Ref." w="31%" ch={<TxtInp v={newFichaR.norma} set={v => setNewFichaR(p => ({...p, norma: v}))} ph="ASTM D1238" />} /></>} />
      <R ch={<F l="Notas / Observaciones" w="100%" ch={<TxtInp v={newFichaR.notas} set={v => setNewFichaR(p => ({...p, notas: v}))} ph="Aplicaciones, condiciones especiales..." />} />} />
      <Btn text={editFicha ? "Actualizar Ficha" : "Guardar Ficha Resina"} ico="✓" color={C.grn} full onClick={addFichaResina} disabled={!newFichaR.nombre} />
    </>} />}

    {/* Modal agregar/editar ficha papel */}
    {showAddFicha && fichaTab === "papeles" && <Modal title={editFicha ? "✏️ Editar Ficha Papel" : "+ Ficha Técnica Papel"} onClose={() => { setShowAddFicha(false); setEditFicha(null); }} ch={<>
      <div style={{ fontSize: 10, color: C.amb, marginBottom: 8, padding: "6px 10px", background: `${C.amb}10`, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>💡 La ficha del papel sí depende del proveedor. Registra por proveedor.</span>
        <button onClick={() => pdfInputRef.current?.click()} disabled={parsingPDF} style={{ background: C.pur, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>
          {parsingPDF ? "⏳ Analizando..." : "📎 Cargar PDF"}
        </button>
      </div>
      <R ch={<><F l="Nombre Producto *" w="58%" ch={<TxtInp v={newFichaP.nombre} set={v => setNewFichaP(p => ({...p, nombre: v}))} ph="Ej: Bond Arpapel 75g" />} /><F l="Tipo" w="38%" ch={<Sel v={newFichaP.tipo} set={v => setNewFichaP(p => ({...p, tipo: v}))} opts={["Bond", "Couché", "Kraft", "Térmico", "Bristol", "Otro"]} />} /></>} />
      <R ch={<><F l="Proveedor" w="58%" ch={<Sel v={newFichaP.proveedor} set={v => setNewFichaP(p => ({...p, proveedor: v}))} opts={[{v:"",l:"— Seleccionar —"}, ...proveedores.map(p=>({v:p.nombre,l:p.nombre})), {v:"otro",l:"Otro"}]} />} /><F l="Gramaje" w="38%" u="g/m²" ch={<Inp v={newFichaP.gramaje} set={v => setNewFichaP(p => ({...p, gramaje: v}))} ph="75" />} /></>} />
      <div style={{ fontSize: 10, fontWeight: 700, color: C.pur, marginTop: 8, marginBottom: 4 }}>PROPIEDADES FÍSICAS</div>
      <R ch={<><F l="Espesor" w="31%" u="μm" ch={<Inp v={newFichaP.espesor} set={v => setNewFichaP(p => ({...p, espesor: v}))} ph="100" />} /><F l="Brightness" w="31%" u="% ISO" ch={<Inp v={newFichaP.brightness} set={v => setNewFichaP(p => ({...p, brightness: v}))} ph="90" />} /><F l="Opacidad" w="31%" u="%" ch={<Inp v={newFichaP.opacidad} set={v => setNewFichaP(p => ({...p, opacidad: v}))} ph="85" />} /></>} />
      <R ch={<><F l="Humedad" w="48%" u="%" ch={<Inp v={newFichaP.humedad} set={v => setNewFichaP(p => ({...p, humedad: v}))} ph="5" />} /><F l="Porosidad Gurley" w="48%" u="s/100ml" ch={<Inp v={newFichaP.porosidad} set={v => setNewFichaP(p => ({...p, porosidad: v}))} ph="20" />} /></>} />
      <div style={{ fontSize: 10, fontWeight: 700, color: C.pur, marginTop: 8, marginBottom: 4 }}>PROPIEDADES MECÁNICAS</div>
      <R ch={<><F l="Resist. Tensión" w="48%" u="kN/m" ch={<Inp v={newFichaP.resistencia_tension} set={v => setNewFichaP(p => ({...p, resistencia_tension: v}))} ph="3.5" />} /><F l="Resist. Rasgado" w="48%" u="mN" ch={<Inp v={newFichaP.resistencia_rasgado} set={v => setNewFichaP(p => ({...p, resistencia_rasgado: v}))} ph="350" />} /></>} />
      <R ch={<><F l="Norma Referencia" w="48%" ch={<TxtInp v={newFichaP.norma} set={v => setNewFichaP(p => ({...p, norma: v}))} ph="ISO 536, TAPPI" />} /><F l="" w="48%" ch={<span />} /></>} />
      <R ch={<F l="Notas" w="100%" ch={<TxtInp v={newFichaP.notas} set={v => setNewFichaP(p => ({...p, notas: v}))} ph="Condiciones de almacenamiento, aplicaciones..." />} />} />
      <Btn text={editFicha ? "Actualizar Ficha" : "Guardar Ficha Papel"} ico="✓" color={C.grn} full onClick={addFichaPapel} disabled={!newFichaP.nombre} />
    </>} />}
  </>;
}
