import { C } from '../utils/constants';
import { fmt, fmtI, genId } from '../utils/helpers';
import { Inp, TxtInp, Sel, F, R, RR, Sec, Badge, Btn, Tab, Modal } from '../components/ui';

export default function Cotizador({
  cotTab, setCotTab, tipo, setTipo, cliente, setCliente,
  resinBlend, setResinBlend, matResinas, matPapeles,
  selPapel, setSelPapel, selResina, setSelResina,
  anchoMaestro, setAnchoMaestro, anchoUtil, setAnchoUtil,
  velMaq, setVelMaq, merma, setMerma, margen, setMargen,
  setupHrs, setSetupHrs, validez, setValidez, condPago, setCondPago,
  q1, setQ1, q2, setQ2, q3, setQ3,
  calc, blendData, papelActual,
  oh, setOh, saving,
  guardarCotizacion, exportarPDF, generateCotizacionTDS, saveOverhead, saveMateriales,
  showAddMatResina, setShowAddMatResina, newMatR, setNewMatR, editMatR, setEditMatR,
  showAddMatPapel, setShowAddMatPapel, newMatP, setNewMatP, editMatP, setEditMatP,
  setMatResinas, setMatPapeles, showToast,
}) {
  return <>
    <Tab tabs={[{ id: "cotizar", ico: "⚖️", l: "Cotizar" }, { id: "materiales", ico: "🧪", l: "Materiales" }, { id: "overhead", ico: "⚙️", l: "Overhead" }]} active={cotTab} set={setCotTab} />
    <div style={{ marginTop: 12 }}>
      {cotTab === "cotizar" && <>
        <Sec t="Specs" ico="📐" ch={<>
          <R ch={<><F l="Tipo" w="32%" ch={<Sel v={tipo} set={setTipo} opts={[{ v: "maquila", l: "Maquila" }, { v: "propio", l: "Propio" }]} />} /><F l="Cliente" w="64%" ch={<TxtInp v={cliente} set={setCliente} ph="Nombre del cliente" />} /></>} />
          {/* RESIN BLEND SELECTOR */}
          <div style={{padding:8,background:`${C.pur}08`,borderRadius:8,border:`1px solid ${C.pur}20`,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:700,color:C.pur}}>🧪 Resinas {resinBlend.length > 1 ? `(Mezcla ${resinBlend.length})` : "(Pura)"}</span>
              {resinBlend.length < 3 && <button onClick={()=>setResinBlend(p=>[...p,{id:matResinas[0]?.id||"r1",pct:0}])} style={{fontSize:10,padding:"2px 8px",borderRadius:4,border:`1px solid ${C.grn}40`,background:`${C.grn}15`,color:C.grn,cursor:"pointer"}}>+ Agregar resina</button>}
            </div>
            {resinBlend.map((slot,idx)=>{
              return <div key={idx} style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                <div style={{flex:1}}><Sel v={slot.id} set={v=>setResinBlend(p=>p.map((s,i)=>i===idx?{...s,id:v}:s))} opts={matResinas.map(r=>({v:r.id,l:`${r.nombre} ($${r.precio}/kg)`}))} /></div>
                <div style={{width:70}}><Inp v={slot.pct} set={v=>setResinBlend(p=>p.map((s,i)=>i===idx?{...s,pct:v}:s))} /></div>
                <span style={{fontSize:10,color:C.t3}}>%</span>
                {resinBlend.length > 1 && <button onClick={()=>setResinBlend(p=>p.filter((_,i)=>i!==idx))} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>✕</button>}
              </div>;
            })}
            {blendData.totalPct !== 100 && <div style={{fontSize:10,color:C.red,marginTop:4}}>⚠️ Total: {blendData.totalPct}% (debe ser 100%)</div>}
            {blendData.totalPct === 100 && blendData.isBlend && <div style={{fontSize:10,color:C.grn,marginTop:4}}>✓ Mezcla: ${fmt(blendData.precio,1)}/kg ponderado | {fmt(blendData.gramaje,1)}g/m²</div>}
          </div>
          {tipo!=="maquila" && <R ch={<F l="📜 Papel" w="100%" ch={<Sel v={selPapel} set={setSelPapel} opts={matPapeles.map(p=>({v:p.id,l:`${p.nombre} ($${p.precio}/kg)`}))} />} />} />}
          <R ch={<><F l="Ancho Maestro" u="mm" w="32%" ch={<Inp v={anchoMaestro} set={setAnchoMaestro} />} /><F l="Ancho Útil" u="mm" w="32%" ch={<Inp v={anchoUtil} set={setAnchoUtil} />} /><F l="Vel" u="m/min" w="32%" ch={<Inp v={velMaq} set={setVelMaq} />} /></>} />
          <R ch={<><F l="Merma Proceso" u="%" w="24%" ch={<Inp v={merma} set={setMerma} />} /><F l="Margen" u="%" w="24%" ch={<Inp v={margen} set={setMargen} />} /><F l="Setup" u="hrs" w="24%" ch={<Inp v={setupHrs} set={setSetupHrs} />} h="Fijo, se diluye" /><F l="Validez" u="días" w="24%" ch={<Inp v={validez} set={setValidez} />} /></>} />
          <R ch={<F l="Cond. Pago" w="48%" ch={<Sel v={condPago} set={setCondPago} opts={["Anticipo 50%","30 días","60 días","90 días","Contra entrega"]} />} />} />
          <div style={{ padding: "8px 10px", background: `${C.grn}10`, borderRadius: 6, fontSize: 11, color: C.t2 }}>
            {tipo!=="maquila" && <div>📜 {papelActual.nombre}: <b>{papelActual.gramaje}g/m²</b> @ <b style={{color:C.amb}}>${papelActual.precio}/kg</b></div>}
            {blendData.isBlend
              ? <div>🧪 Mezcla: {blendData.parts.map((p,i) => <span key={i}>{i>0?" + ":" "}<b>{p.pct}%</b> {p.nombre} (${p.precio}/kg)</span>)} → <b style={{color:C.amb}}>${fmt(blendData.precio,1)}/kg</b></div>
              : <div>🧪 {matResinas.find(r=>r.id===resinBlend[0]?.id)?.nombre||'PE'}: <b>{blendData.gramaje}g/m² (µ)</b> @ <b style={{color:C.amb}}>${fmt(blendData.precio,1)}/kg</b></div>
            }
            <div style={{marginTop:4}}>
              {tipo==="maquila"
                ? <>Estructura: <b style={{color:C.grn}}>{fmt(blendData.gramaje,0)}g/m² {blendData.isBlend?"Mezcla":"PE"}</b> <Badge text="Maquila" color={C.amb} /></>
                : <>Estructura: {papelActual.gramaje}g + {fmt(blendData.gramaje,0)}g = <b style={{ color: C.grn }}>{calc.totalGrM2}g/m²</b></>}
            </div>
            <div style={{marginTop:2}}>Ancho: <b>{anchoMaestro}mm</b> maestro → <b style={{color:C.cyn}}>{anchoUtil}mm</b> útil — <span style={{color: calc.mermaRefil > 3 ? C.red : C.grn}}>Refil: {fmt(calc.mermaRefil,1)}%</span> + Proceso: {merma}%</div>
          </div>
        </>} />
        <Sec t="Cantidades (kg)" ico="📊" col={C.acc} ch={<R ch={<><F l="Cant 1" w="32%" ch={<Inp v={q1} set={setQ1} />} /><F l="Cant 2" w="32%" ch={<Inp v={q2} set={setQ2} />} /><F l="Cant 3" w="32%" ch={<Inp v={q3} set={setQ3} />} /></>} />} />
        {[calc.e1, calc.e2, calc.e3].filter(Boolean).map((e, i) => {
          const cs = [C.grn, C.acc, C.amb];
          return (
            <Sec key={i} t={`${fmtI(e.q)}kg — ${fmtI(e.m2)}m²`} ico={["🟢", "🔵", "🟡"][i]} col={cs[i]} ch={
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: 8, background: C.bg, borderRadius: 6, fontSize: 10 }}>
                  <RR l="Resina" v={e.costoResina} sm />
                  {!calc.esMaq && <RR l="Papel" v={e.costoPapel} sm />}
                  <RR l="Overhead (prod)" v={e.costoOH} sm />
                  <RR l={`Setup ${setupHrs}h fijo`} v={e.costoSetup} sm c={C.amb} />
                  <div style={{ fontSize: 9, color: C.t3, textAlign: "right" }}>= ${fmt(e.setupPorKg)}/kg diluido</div>
                  <div style={{ borderTop: `1px solid ${C.brd}`, marginTop: 4, paddingTop: 4 }}><RR l="Costo Total" v={e.costoTotal} b /></div>
                </div>
                <div style={{ padding: 8, background: `${cs[i]}08`, borderRadius: 6, border: `1px solid ${cs[i]}30`, fontSize: 10 }}>
                  <RR l="Precio Total" v={e.pv} b c={cs[i]} />
                  <RR l="$/kg" v={e.pk} sm />
                  <RR l="$/m²" v={e.pm2} sm c={C.cyn} />
                  <div style={{ borderTop: `1px solid ${C.brd}`, marginTop: 4, paddingTop: 4 }}><RR l="Utilidad" v={e.ut} b c={C.grn} /></div>
                </div>
              </div>
            } />
          );
        })}
        {[calc.e1, calc.e2, calc.e3].some(Boolean) && <div style={{ marginTop: 4, display: "flex", gap: 8, flexDirection: "column" }}>
          <Btn text={saving ? "Guardando..." : "💾 Guardar Cotización → CRM"} color={C.grn} full onClick={guardarCotizacion} disabled={saving || !cliente} />
          <Btn text="📄 Descargar PDF" color={C.acc} full outline onClick={exportarPDF} disabled={!cliente} />
          <Btn text="📋 Ficha Técnica Materiales" color={C.pur} full outline onClick={() => {
            const mats = {
              resinas: blendData.parts.map(p => ({ nombre: p.nombre, pct: p.pct })),
              papeles: [{ nombre: matPapeles.find(p => p.id === selPapel)?.nombre || "—" }]
            };
            generateCotizacionTDS(mats);
          }} />
        </div>}
      </>}

      {/* MATERIALES TAB */}
      {cotTab === "materiales" && <>
        <Sec t="Resinas" ico="🧪" right={<Btn text="+" sm color={C.grn} onClick={()=>setShowAddMatResina(true)} />} ch={<>
          {matResinas.map((r,i)=>(
            <div key={r.id} style={{padding:10,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${selResina===r.id?C.acc:C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setSelResina(r.id)}>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>{r.nombre}</div>
                <div style={{fontSize:10,color:C.t3}}>{r.tipo} • {r.gramaje}g/m²</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:14,fontWeight:800,color:C.acc,fontFamily:"monospace"}}>${r.precio}/kg</div>
                <button onClick={e=>{e.stopPropagation();setNewMatR({nombre:r.nombre,tipo:r.tipo,precio:String(r.precio),gramaje:String(r.gramaje)});setEditMatR(r);setShowAddMatResina(true);}} style={{background:"none",border:"none",color:C.acc,cursor:"pointer",fontSize:12}}>✏️</button>
                <button onClick={e=>{e.stopPropagation();setMatResinas(p=>p.filter(x=>x.id!==r.id));}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            </div>
          ))}
        </>} />
        <Sec t="Papeles" ico="📜" right={<Btn text="+" sm color={C.grn} onClick={()=>{setEditMatP(null);setNewMatP({nombre:"",tipo:"Bond",precio:"20",gramaje:"80"});setShowAddMatPapel(true);}} />} ch={<>
          {matPapeles.map((p,i)=>(
            <div key={p.id} style={{padding:10,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${selPapel===p.id?C.pur:C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setSelPapel(p.id)}>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>{p.nombre}</div>
                <div style={{fontSize:10,color:C.t3}}>{p.tipo} • {p.gramaje}g/m²</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:14,fontWeight:800,color:C.pur,fontFamily:"monospace"}}>${p.precio}/kg</div>
                <button onClick={e=>{e.stopPropagation();setNewMatP({nombre:p.nombre,tipo:p.tipo,precio:String(p.precio),gramaje:String(p.gramaje)});setEditMatP(p);setShowAddMatPapel(true);}} style={{background:"none",border:"none",color:C.pur,cursor:"pointer",fontSize:12}}>✏️</button>
                <button onClick={e=>{e.stopPropagation();setMatPapeles(prev=>prev.filter(x=>x.id!==p.id));}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            </div>
          ))}
        </>} />
        <Btn text="💾 Guardar Materiales" color={C.acc} full onClick={saveMateriales} />

        {showAddMatResina && <Modal title={editMatR ? "✏️ Editar Resina" : "+ Resina"} onClose={()=>{setShowAddMatResina(false);setEditMatR(null);}} ch={<>
          <R ch={<F l="Nombre" w="100%" ch={<TxtInp v={newMatR.nombre} set={v=>setNewMatR(p=>({...p,nombre:v}))} ph="Ej: PEBD SM Resinas" />} />} />
          <R ch={<><F l="Tipo" w="32%" ch={<Sel v={newMatR.tipo} set={v=>setNewMatR(p=>({...p,tipo:v}))} opts={["PEBD","PEAD","Supreme","PELBD","Ionómero","PP","EVA"]} />} /><F l="Gramaje" u="g/m²" w="32%" ch={<Inp v={newMatR.gramaje} set={v=>setNewMatR(p=>({...p,gramaje:v}))} />} /><F l="Precio" u="$/kg" w="32%" ch={<Inp v={newMatR.precio} set={v=>setNewMatR(p=>({...p,precio:v}))} pre="$" />} /></>} />
          <Btn text={editMatR ? "Actualizar" : "Agregar"} ico="✓" color={C.grn} full onClick={()=>{
            if(!newMatR.nombre) return;
            if(editMatR) {
              setMatResinas(p=>p.map(r=>r.id===editMatR.id?{...r,nombre:newMatR.nombre,tipo:newMatR.tipo,precio:parseFloat(newMatR.precio)||32,gramaje:parseFloat(newMatR.gramaje)||15}:r));
              showToast("Resina actualizada");
            } else {
              setMatResinas(p=>[...p,{id:genId(),nombre:newMatR.nombre,tipo:newMatR.tipo,precio:parseFloat(newMatR.precio)||32,gramaje:parseFloat(newMatR.gramaje)||15}]);
              showToast("Resina agregada");
            }
            setShowAddMatResina(false);setEditMatR(null);setNewMatR({nombre:"",tipo:"PEBD",precio:"32",gramaje:"15"});
          }} />
        </>} />}

        {showAddMatPapel && <Modal title={editMatP ? "✏️ Editar Papel" : "+ Papel"} onClose={()=>{setShowAddMatPapel(false);setEditMatP(null);}} ch={<>
          <R ch={<F l="Nombre" w="100%" ch={<TxtInp v={newMatP.nombre} set={v=>setNewMatP(p=>({...p,nombre:v}))} ph="Ej: Bond Arpapel 60g" />} />} />
          <R ch={<><F l="Tipo" w="32%" ch={<Sel v={newMatP.tipo} set={v=>setNewMatP(p=>({...p,tipo:v}))} opts={["Bond","Couché","Kraft","Recubierto","Térmico"]} />} /><F l="Gramaje" u="g/m²" w="32%" ch={<Inp v={newMatP.gramaje} set={v=>setNewMatP(p=>({...p,gramaje:v}))} />} /><F l="Precio" u="$/kg" w="32%" ch={<Inp v={newMatP.precio} set={v=>setNewMatP(p=>({...p,precio:v}))} pre="$" />} /></>} />
          <Btn text={editMatP ? "Actualizar" : "Agregar"} ico="✓" color={C.grn} full onClick={()=>{
            if(!newMatP.nombre) return;
            if(editMatP) {
              setMatPapeles(p=>p.map(x=>x.id===editMatP.id?{...x,nombre:newMatP.nombre,tipo:newMatP.tipo,precio:parseFloat(newMatP.precio)||20,gramaje:parseFloat(newMatP.gramaje)||80}:x));
              showToast("Papel actualizado");
            } else {
              setMatPapeles(p=>[...p,{id:genId(),nombre:newMatP.nombre,tipo:newMatP.tipo,precio:parseFloat(newMatP.precio)||20,gramaje:parseFloat(newMatP.gramaje)||80}]);
              showToast("Papel agregado");
            }
            setShowAddMatPapel(false);setEditMatP(null);setNewMatP({nombre:"",tipo:"Bond",precio:"20",gramaje:"80"});
          }} />
        </>} />}
      </>}

      {cotTab === "overhead" && <Sec t="Overhead Mensual" ico="⚙️" ch={<>
        <R ch={<><F l="Renta" w="48%" ch={<Inp v={oh.renta} set={v => setOh(p => ({...p, renta: parseFloat(v)||0}))} pre="$" />} /><F l="Luz" w="48%" ch={<Inp v={oh.luz} set={v => setOh(p => ({...p, luz: parseFloat(v)||0}))} pre="$" />} /></>} />
        <R ch={<><F l="Gas" w="48%" ch={<Inp v={oh.gas} set={v => setOh(p => ({...p, gas: parseFloat(v)||0}))} pre="$" />} /><F l="Agua" w="48%" ch={<Inp v={oh.agua} set={v => setOh(p => ({...p, agua: parseFloat(v)||0}))} pre="$" />} /></>} />
        <R ch={<><F l="Mant." w="48%" ch={<Inp v={oh.mantenimiento} set={v => setOh(p => ({...p, mantenimiento: parseFloat(v)||0}))} pre="$" />} /><F l="MO" w="48%" ch={<Inp v={oh.mo_directa} set={v => setOh(p => ({...p, mo_directa: parseFloat(v)||0}))} pre="$" />} /></>} />
        <R ch={<><F l="Socios" w="48%" ch={<Inp v={oh.socios} set={v => setOh(p => ({...p, socios: parseFloat(v)||0}))} pre="$" />} /><F l="Otros" w="48%" ch={<Inp v={oh.otros} set={v => setOh(p => ({...p, otros: parseFloat(v)||0}))} pre="$" />} /></>} />
        <R ch={<F l="Horas/mes" w="48%" ch={<Inp v={oh.horas_mes} set={v => setOh(p => ({...p, horas_mes: parseFloat(v)||176}))} />} />} />
        <div style={{ padding: 12, background: `${C.acc}08`, borderRadius: 6, marginTop: 8 }}>
          <RR l="Total/mes" v={calc.ohTotal} b />
          <RR l="OH/hora" v={calc.ohHr} b c={C.grn} />
        </div>
        <div style={{ marginTop: 10 }}><Btn text="💾 Guardar Overhead" color={C.acc} full onClick={saveOverhead} /></div>
      </>} />}
    </div>
  </>;
}
