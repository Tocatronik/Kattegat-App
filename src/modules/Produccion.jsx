import { C, TEMP_ZONES } from '../utils/constants';
import { fmtI } from '../utils/helpers';
import { Inp, TxtInp, Sel, F, R, Sec, Badge, Btn, Tab, Modal, Card } from '../components/ui';

const statusColor = (s) => s === "en_proceso" ? C.grn : s === "completada" ? C.acc : s === "pausada" ? C.amb : C.t3;
const statusBorder = (s) => s === "en_proceso" ? C.grn + "40" : s === "pausada" ? C.amb + "40" : C.brd;

export default function Produccion({
  prodTab, setProdTab, turno, setTurno, turnoInicio, setTurnoInicio,
  metrics, resinas, papeles, ots, bobinas, clientes, matResinas,
  showAddResina, setShowAddResina, newResina, setNewResina, addResina,
  showAddPapel, setShowAddPapel, newPapel, setNewPapel, addPapel,
  showAddOT, setShowAddOT, newOT, setNewOT, addOT,
  showAddBobina, setShowAddBobina, newBobina, setNewBobina, addBobina,
  updateOTStatus, saving, isAdmin,
  showMachineSetup, setShowMachineSetup, machineTemps, setMachineTemps,
  machineParams, setMachineParams, startOTWithConditions,
  showTrace, printTraceLabel, printMPLabel, generateCoCPdf,
  setShowSolicitud,
}) {
  return <>
    <Tab tabs={[
      { id: "dashboard", ico: "📊", l: "Inicio" }, { id: "resinas", ico: "🧪", l: "Resinas" },
      { id: "papel", ico: "📜", l: "Papel" }, { id: "ots", ico: "📋", l: "OTs" }, { id: "bobinas", ico: "📦", l: "Bobinas" },
    ]} active={prodTab} set={setProdTab} />
    <div style={{ marginTop: 12 }}>
      {prodTab === "dashboard" && <>
        <div style={{ padding: 12, borderRadius: 10, marginBottom: 12, background: turno ? `${C.grn}10` : C.s2, border: `1px solid ${turno ? C.grn : C.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: turno ? C.grn : C.t3 }}>{turno ? "🟢 Turno Activo" : "⚪ Sin turno"}</div>
            {turno && turnoInicio && <div style={{ fontSize: 10, color: C.t2 }}>Inicio: {turnoInicio}</div>}
          </div>
          <Btn text={turno ? "Cerrar" : "Iniciar"} color={turno ? C.red : C.grn}
            onClick={() => { setTurno(!turno); setTurnoInicio(turno ? null : new Date().toLocaleTimeString("es-MX")); }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <Card v={`${fmtI(metrics.resinasKg)}kg`} l="Resina" s={`${metrics.resinasDisp} sacos`} c={C.acc} ico="🧪" />
          <Card v={metrics.papelBobinas} l="Papel" s="bobinas" c={C.grn} ico="📜" />
          <Card v={metrics.otsActivas} l="OTs Activas" s={`${metrics.otsPausadas || 0} pausadas · ${metrics.otsPendientes} pend.`} c={C.amb} ico="📋" />
          <Card v={`${fmtI(metrics.totalMetros)}m`} l="Producción" s={`${metrics.totalBobinas} bob.`} c={C.pur} ico="📦" />
        </div>
      </>}

      {prodTab === "resinas" && <>
        <Sec t={`Resinas (${fmtI(metrics.resinasKg)}kg)`} ico="🧪" right={<Btn text="+" sm color={C.grn} onClick={() => setShowAddResina(true)} />}
          ch={<>{resinas.slice(0, 20).map((r, i) => (
            <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}`, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{r.codigo}</span>
                  <Badge text={r.tipo} color={C.acc} />
                  <Badge text={r.status} color={r.status === "disponible" ? C.grn : C.amb} />
                </div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}><b style={{ color: C.t2 }}>{r.proveedor_nombre}</b> • ${r.costo_kg}/kg{r.folio_packing && <span style={{color:C.cyn}}> • PL:{r.folio_packing}</span>}</div>
                {r.updated_by && <div style={{fontSize:9,color:C.t3,marginTop:1,fontStyle:"italic"}}>Editado: {r.updated_by}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>{r.peso_kg}kg</div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>printMPLabel(r,'resina')} style={{background:`${C.acc}15`,border:`1px solid ${C.acc}30`,color:C.acc,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>📱 QR</button>
                  {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"resina",id:r.id,codigo:r.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>📩 Corrección</button>}
                </div>
              </div>
            </div>
          ))}</>}
        />
        {showAddResina && <Modal title="+ Resina" onClose={() => setShowAddResina(false)} ch={<>
          <R ch={<F l="Material del catálogo" w="100%" ch={<Sel v={newResina.tipo} set={v => {
            const mat = matResinas.find(r=>r.nombre===v);
            if(mat) setNewResina(p=>({...p, tipo: mat.tipo, proveedor: mat.nombre, costo: String(mat.precio)}));
            else setNewResina(p=>({...p, tipo: v}));
          }} opts={matResinas.map(r=>({v:r.nombre,l:`${r.nombre} (${r.tipo} $${r.precio}/kg)`}))} />} />} />
          <R ch={<><F l="Peso" u="kg" w="48%" ch={<Inp v={newResina.peso} set={v => setNewResina(p => ({...p, peso: v}))} />} /><F l="Costo" u="$/kg" w="48%" ch={<Inp v={newResina.costo} set={v => setNewResina(p => ({...p, costo: v}))} pre="$" />} /></>} />
          <R ch={<F l="Folio Packing List" w="100%" ch={<TxtInp v={newResina.folio_packing} set={v => setNewResina(p => ({...p, folio_packing: v}))} ph="Folio del packing list del proveedor" />} />} />
          <div style={{fontSize:10,color:C.t3,padding:"4px 0",fontStyle:"italic"}}>💡 Los materiales se configuran en Cotizador → Materiales</div>
          <Btn text={saving ? "Guardando..." : "Guardar"} ico="✓" color={C.grn} full onClick={addResina} disabled={saving} />
        </>} />}
      </>}

      {prodTab === "papel" && <>
        <Sec t={`Papel (${papeles.length})`} ico="📜" right={<Btn text="+" sm color={C.grn} onClick={() => setShowAddPapel(true)} />}
          ch={<>{papeles.slice(0, 20).map((p, i) => (
            <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{p.codigo}</span>
                  <Badge text={p.tipo} color={C.pur} />
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.t2 }}>{p.cliente_nombre} • {p.proveedor}{p.folio_packing && <span style={{color:C.cyn}}> • PL:{p.folio_packing}</span>}</div>
              <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 2, flexWrap:"wrap", alignItems:"center" }}>
                <span>{p.gramaje}g/m²</span><span>↔{p.ancho_mm}mm</span><span>📏{fmtI(p.metros_lineales)}m</span><span>⚖️{p.peso_kg}kg</span>
                <button onClick={()=>printMPLabel(p,'papel')} style={{background:`${C.acc}15`,border:`1px solid ${C.acc}30`,color:C.acc,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer",marginLeft:"auto"}}>📱 QR</button>
                {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"papel",id:p.id,codigo:p.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>📩 Corrección</button>}
              </div>
            </div>
          ))}</>}
        />
        {showAddPapel && <Modal title="+ Papel" onClose={() => setShowAddPapel(false)} ch={<>
          <R ch={<><F l="Cliente" w="48%" ch={<TxtInp v={newPapel.cliente} set={v => setNewPapel(p => ({...p, cliente: v}))} />} /><F l="Tipo" w="48%" ch={<Sel v={newPapel.tipo} set={v => setNewPapel(p => ({...p, tipo: v}))} opts={["Bond", "Recubierto", "Kraft", "Couché"]} />} /></>} />
          <R ch={<F l="Proveedor" w="100%" ch={<TxtInp v={newPapel.proveedor} set={v => setNewPapel(p => ({...p, proveedor: v}))} />} />} />
          <R ch={<><F l="Gramaje" w="32%" ch={<Inp v={newPapel.gramaje} set={v => setNewPapel(p => ({...p, gramaje: v}))} />} /><F l="Ancho" u="mm" w="32%" ch={<Inp v={newPapel.ancho} set={v => setNewPapel(p => ({...p, ancho: v}))} />} /><F l="Metros" w="32%" ch={<Inp v={newPapel.metros} set={v => setNewPapel(p => ({...p, metros: v}))} />} /></>} />
          <R ch={<><F l="Peso" u="kg" w="48%" ch={<Inp v={newPapel.peso} set={v => setNewPapel(p => ({...p, peso: v}))} />} /><F l="Folio Packing" w="48%" ch={<TxtInp v={newPapel.folio_packing} set={v => setNewPapel(p => ({...p, folio_packing: v}))} ph="Folio proveedor" />} /></>} />
          <Btn text={saving ? "Guardando..." : "Guardar"} ico="✓" color={C.grn} full onClick={addPapel} disabled={saving} />
        </>} />}
      </>}

      {prodTab === "ots" && <>
        <Sec t="OTs" ico="📋" right={<Btn text="+" sm color={C.acc} onClick={() => setShowAddOT(true)} />}
          ch={<>{ots.slice(0, 20).map((ot, i) => {
            const otBobinas = bobinas.filter(b => b.ot_id === ot.id || b.ot_codigo === ot.codigo);
            const metrosProducidos = otBobinas.reduce((s, b) => s + (b.metros_lineales || 0), 0);
            const metrosPedidos = (() => { const m = ot.producto?.match(/([\d,.]+)\s*(?:metros|m\b)/i); return m ? parseInt(m[1].replace(/,/g, '')) : 0; })();
            const progreso = metrosPedidos > 0 ? Math.min((metrosProducidos / metrosPedidos) * 100, 100) : 0;
            return <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${statusBorder(ot.status)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{ot.codigo}</span>
                  <Badge text={ot.status === "pausada" ? "⏸ pausada" : ot.status?.replace("_", " ")} color={statusColor(ot.status)} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {ot.status === "pendiente" && <Btn text="▶" sm color={C.grn} onClick={() => updateOTStatus(ot.id, "en_proceso")} />}
                  {ot.status === "pausada" && <Btn text="▶" sm color={C.grn} onClick={() => updateOTStatus(ot.id, "en_proceso")} />}
                  {ot.status === "en_proceso" && <Btn text="⏸" sm color={C.amb} onClick={() => updateOTStatus(ot.id, "pausada")} />}
                  {(ot.status === "en_proceso" || ot.status === "pausada") && <Btn text="✓" sm color={C.acc} onClick={() => updateOTStatus(ot.id, "completada")} />}
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.t2 }}>{ot.cliente_nombre} — {ot.producto}</div>
              {metrosPedidos > 0 && <div style={{ marginTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.t3, marginBottom: 2 }}>
                  <span>{fmtI(metrosProducidos)}m producidos</span>
                  <span>{fmtI(metrosPedidos)}m pedidos ({progreso.toFixed(0)}%)</span>
                </div>
                <div style={{ height: 6, background: C.s2, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progreso}%`, background: progreso >= 100 ? C.grn : C.acc, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>}
              <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 4, flexWrap:"wrap", alignItems:"center" }}>
                <span>📦 {otBobinas.length}</span><span>📏 {fmtI(metrosProducidos)}m</span><span>💳 {ot.dias_credito}d</span>
                {ot.updated_by && <span style={{fontStyle:"italic"}}>✏️ {ot.updated_by}</span>}
                {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"OT",id:ot.id,codigo:ot.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer",marginLeft:"auto"}}>📩 Corrección</button>}
              </div>
            </div>;
          })}</>}
        />
        {showAddOT && <Modal title="+ OT" onClose={() => setShowAddOT(false)} ch={<>
          <R ch={<><F l="Cliente *" w="58%" ch={<Sel v={newOT.cliente} set={v => setNewOT(p => ({...p, cliente: v}))} opts={[{v:"",l:"— Seleccionar —"}, ...clientes.map(c => ({v:c.id,l:c.nombre}))]} />} /><F l="Tipo" w="38%" ch={<Sel v={newOT.tipo} set={v => setNewOT(p => ({...p, tipo: v}))} opts={["maquila", "propio"]} />} /></>} />
          <R ch={<F l="Producto" w="100%" ch={<TxtInp v={newOT.producto} set={v => setNewOT(p => ({...p, producto: v}))} ph="Bond 80g + PE 15µ" />} />} />
          <R ch={<F l="Días crédito" w="48%" ch={<Inp v={newOT.diasCredito} set={v => setNewOT(p => ({...p, diasCredito: v}))} />} />} />
          <Btn text={saving ? "Creando..." : "Crear OT"} ico="✓" color={C.acc} full onClick={addOT} disabled={saving || !newOT.cliente} />
        </>} />}

        {/* POPUP: Machine Conditions when starting an OT */}
        {showMachineSetup && (() => {
          const setupOT = ots.find(o => o.id === showMachineSetup);
          return <Modal title={`🌡️ Condiciones de Máquina — ${setupOT?.codigo || ''}`} onClose={() => setShowMachineSetup(null)} ch={<>
            <div style={{padding:8,background:`${C.amb}10`,borderRadius:6,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.amb}}>Registra las condiciones antes de arrancar</div>
              <div style={{fontSize:10,color:C.t2}}>OT: {setupOT?.codigo} — {setupOT?.cliente_nombre} — {setupOT?.producto}</div>
            </div>
            {TEMP_ZONES.map(group => (
              <div key={group.group} style={{marginBottom:8}}>
                <div style={{fontSize:10,fontWeight:700,color:C.pur,marginBottom:3,textTransform:"uppercase"}}>{group.group}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(80px, 1fr))",gap:4}}>
                  {group.zones.map(zone => (
                    <div key={zone}>
                      <div style={{fontSize:8,color:C.t3,marginBottom:1}}>{zone}</div>
                      <input value={machineTemps[zone]||""} onChange={e=>setMachineTemps(p=>({...p,[zone]:e.target.value.replace(/[^0-9.]/g,"")}))}
                        placeholder="°C" style={{width:"100%",background:C.bg,border:`1px solid ${machineTemps[zone]?C.grn:C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{fontSize:10,fontWeight:700,color:C.pur,marginBottom:3,marginTop:8,textTransform:"uppercase"}}>Indicadores de Máquina</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              <div><div style={{fontSize:8,color:C.t3,marginBottom:1}}>RPM Extruder</div><input value={machineParams.rpm_extruder} onChange={e=>setMachineParams(p=>({...p,rpm_extruder:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="RPM" style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} /></div>
              <div><div style={{fontSize:8,color:C.t3,marginBottom:1}}>AMP Motor</div><input value={machineParams.amp_motor} onChange={e=>setMachineParams(p=>({...p,amp_motor:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="A" style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} /></div>
              <div><div style={{fontSize:8,color:C.t3,marginBottom:1}}>Vel. Extruder</div><input value={machineParams.vel_extruder} onChange={e=>setMachineParams(p=>({...p,vel_extruder:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="" style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} /></div>
              <div><div style={{fontSize:8,color:C.t3,marginBottom:1}}>RPM Línea</div><input value={machineParams.rpm_linea} onChange={e=>setMachineParams(p=>({...p,rpm_linea:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="RPM" style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} /></div>
              <div><div style={{fontSize:8,color:C.t3,marginBottom:1}}>Vel. Línea</div><input value={machineParams.vel_linea} onChange={e=>setMachineParams(p=>({...p,vel_linea:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="" style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} /></div>
              <div><div style={{fontSize:8,color:C.t3,marginBottom:1}}>MPM Línea</div><input value={machineParams.mpm_linea} onChange={e=>setMachineParams(p=>({...p,mpm_linea:e.target.value.replace(/[^0-9.]/g,"")}))} placeholder="m/min" style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} /></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:6,marginTop:6}}>
              <div><div style={{fontSize:8,color:C.t3,marginBottom:1}}>Mallas Mesh</div><input value={machineParams.mallas_mesh} onChange={e=>setMachineParams(p=>({...p,mallas_mesh:e.target.value}))} placeholder="80/120/80" style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:12,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} /></div>
            </div>
            <div style={{marginTop:6}}><div style={{fontSize:8,color:C.t3,marginBottom:1}}>Observaciones Máquina</div><input value={machineParams.observaciones_maq} onChange={e=>setMachineParams(p=>({...p,observaciones_maq:e.target.value}))} placeholder="Notas de condiciones, cambios de malla..." style={{width:"100%",background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t1,padding:"4px 6px",fontSize:11,outline:"none",boxSizing:"border-box"}} /></div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn text={saving ? "Guardando..." : "▶ Arrancar OT"} ico="🌡️" color={C.grn} full onClick={startOTWithConditions} disabled={saving} />
            </div>
            <div style={{textAlign:"center",marginTop:6}}>
              <button onClick={() => { startOTWithConditions(); }} style={{background:"none",border:"none",color:C.t3,fontSize:10,cursor:"pointer",textDecoration:"underline"}}>
                Arrancar sin condiciones
              </button>
            </div>
          </>} />;
        })()}
      </>}

      {prodTab === "bobinas" && <>
        <Sec t={`Bobinas (${fmtI(metrics.totalMetros)}m)`} ico="📦" right={<Btn text="+" sm color={C.grn} onClick={() => { setNewBobina(p => ({...p, ot_id: ots.find(o => o.status === "en_proceso")?.id || ""})); setShowAddBobina(true); }} />}
          ch={<>
            {bobinas.slice(0, 20).map((b, i) => (
              <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}`, display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{b.codigo}</span>
                    <Badge text={b.ot_codigo} color={C.acc} />
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 2 }}>
                    <span>↔{b.ancho_mm}mm</span><span>📏{fmtI(b.metros_lineales)}m</span><span>{b.gramaje_total}g/m²</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace" }}>{b.peso_kg}kg</div>
                  <div style={{ fontSize: 9, color: C.t3 }}>{fmtI((b.metros_lineales || 0) * (b.ancho_mm || 0) / 1000)}m²</div>
                  <div style={{display:"flex",gap:3}}>
                    <button onClick={()=>showTrace(b)} style={{background:`${C.pur}15`,border:`1px solid ${C.pur}30`,color:C.pur,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>🔍 Traza</button>
                    <button onClick={()=>printTraceLabel(b)} style={{background:`${C.acc}15`,border:`1px solid ${C.acc}30`,color:C.acc,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>📱 QR</button>
                    {(b.trazabilidad || b.lote) && <button onClick={()=>generateCoCPdf(b)} style={{background:`${C.grn}15`,border:`1px solid ${C.grn}30`,color:C.grn,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>✅ CoC</button>}
                    {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"bobina",id:b.id,codigo:b.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>📩</button>}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 10, padding: 10, background: `${C.pur}08`, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.pur, fontWeight: 600, marginBottom: 4 }}>📊 PACKING</div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.t2 }}>
                <span>Bob: <b>{metrics.totalBobinas}</b></span>
                <span>Metros: <b>{fmtI(metrics.totalMetros)}</b></span>
                <span>Peso: <b>{fmtI(metrics.totalKg)}kg</b></span>
              </div>
            </div>
          </>}
        />
        {showAddBobina && <Modal title="+ Bobina PT (con Trazabilidad)" onClose={() => setShowAddBobina(false)} ch={<>
          <R ch={<F l="OT" w="100%" ch={<Sel v={newBobina.ot_id} set={v => setNewBobina(p => ({...p, ot_id: v}))} opts={ots.filter(o => o.status === "en_proceso" || o.status === "pausada").map(o => ({ v: o.id, l: `${o.codigo} - ${o.cliente_nombre}${o.status === "pausada" ? " ⏸" : ""}` }))} />} />} />
          <R ch={<><F l="Ancho" u="mm" w="32%" ch={<Inp v={newBobina.ancho} set={v => setNewBobina(p => ({...p, ancho: v}))} />} /><F l="Metros" w="32%" ch={<Inp v={newBobina.metros} set={v => setNewBobina(p => ({...p, metros: v}))} />} /><F l="Peso" u="kg" w="32%" ch={<Inp v={newBobina.peso} set={v => setNewBobina(p => ({...p, peso: v}))} />} /></>} />
          <R ch={<F l="Gramaje" u="g/m²" w="48%" ch={<Inp v={newBobina.gramaje} set={v => setNewBobina(p => ({...p, gramaje: v}))} />} />} />
          <div style={{borderTop:`1px solid ${C.brd}`,marginTop:8,paddingTop:8}}>
            <div style={{fontSize:12,fontWeight:700,color:C.pur,marginBottom:6}}>🔗 Trazabilidad - Materia Prima Usada</div>
            <div style={{fontSize:11,color:C.t2,marginBottom:4}}>Resinas utilizadas:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
              {resinas.filter(r=>r.status==="disponible").map(r => (
                <button key={r.id} onClick={()=>setNewBobina(p=>({...p, resinas_usadas: p.resinas_usadas.includes(r.id) ? p.resinas_usadas.filter(x=>x!==r.id) : [...p.resinas_usadas, r.id]}))}
                  style={{fontSize:10,padding:"4px 8px",borderRadius:6,cursor:"pointer",border:`1px solid ${newBobina.resinas_usadas.includes(r.id)?C.grn:C.brd}`,background:newBobina.resinas_usadas.includes(r.id)?`${C.grn}20`:"transparent",color:newBobina.resinas_usadas.includes(r.id)?C.grn:C.t3}}>
                  🧪 {r.codigo} {r.tipo} {r.peso_kg}kg
                </button>
              ))}
              {!resinas.filter(r=>r.status==="disponible").length && <span style={{fontSize:10,color:C.t3}}>Sin resinas disponibles</span>}
            </div>
            <div style={{fontSize:11,color:C.t2,marginBottom:4}}>Papeles utilizados:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
              {papeles.filter(p=>p.status==="disponible").map(p => (
                <button key={p.id} onClick={()=>setNewBobina(prev=>({...prev, papeles_usados: prev.papeles_usados.includes(p.id) ? prev.papeles_usados.filter(x=>x!==p.id) : [...prev.papeles_usados, p.id]}))}
                  style={{fontSize:10,padding:"4px 8px",borderRadius:6,cursor:"pointer",border:`1px solid ${newBobina.papeles_usados.includes(p.id)?C.grn:C.brd}`,background:newBobina.papeles_usados.includes(p.id)?`${C.grn}20`:"transparent",color:newBobina.papeles_usados.includes(p.id)?C.grn:C.t3}}>
                  📜 {p.codigo} {p.tipo} {p.peso_kg}kg
                </button>
              ))}
              {!papeles.filter(p=>p.status==="disponible").length && <span style={{fontSize:10,color:C.t3}}>Sin papeles disponibles</span>}
            </div>
            <R ch={<F l="Observaciones" w="100%" ch={<TxtInp v={newBobina.observaciones} set={v=>setNewBobina(p=>({...p,observaciones:v}))} ph="Notas de producción, incidencias..." />} />} />
          </div>
          {/* Machine conditions inherited from OT */}
          {(() => {
            const selOT = ots.find(o => o.id === newBobina.ot_id);
            const cm = selOT?.condiciones_maquina ? (typeof selOT.condiciones_maquina === 'string' ? JSON.parse(selOT.condiciones_maquina) : selOT.condiciones_maquina) : null;
            return cm ? (
              <div style={{borderTop:`1px solid ${C.brd}`,marginTop:8,paddingTop:8}}>
                <div style={{fontSize:10,color:C.grn,fontWeight:700}}>🌡️ Condiciones heredadas de {selOT.codigo}</div>
                <div style={{fontSize:10,color:C.t2,marginTop:2}}>{Object.keys(cm.temperaturas||{}).length} zonas temp. | RPM: {cm.rpm_extruder||'—'} | AMP: {cm.amp_motor||'—'} | MPM: {cm.mpm_linea||'—'}</div>
              </div>
            ) : (
              <div style={{borderTop:`1px solid ${C.brd}`,marginTop:8,paddingTop:8}}>
                <div style={{fontSize:10,color:C.amb}}>⚠️ La OT no tiene condiciones de máquina. Regístralas al iniciar la OT (botón ▶).</div>
              </div>
            );
          })()}
          <Btn text={saving ? "Guardando..." : "Guardar con Trazabilidad"} ico="✓" color={C.grn} full onClick={addBobina} disabled={saving || !newBobina.ot_id} />
        </>} />}
      </>}
    </div>
  </>;
}
