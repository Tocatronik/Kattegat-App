import { C, STAGES } from '../utils/constants';
import { fmtI, genId } from '../utils/helpers';
import { Inp, TxtInp, Sel, F, R, Sec, Badge, Btn, Tab, Modal, Card } from '../components/ui';

export default function CRM({
  crmTab, setCrmTab, clientes, cotCRM, setCotCRM, actividades,
  showClienteDetail, setShowClienteDetail,
  showAddCliente, setShowAddCliente, newCliente, setNewCliente,
  showAddCotCRM, setShowAddCotCRM, newCotCRM, setNewCotCRM,
  editCot, setEditCot, editingCliente, setEditingCliente,
  editClienteData, setEditClienteData,
  updateCliente, deleteCliente, logActivity, showToast,
  saving, setSaving, currentUser, supabase,
}) {
  return <>
    <Tab tabs={[{id:"pipeline",ico:"🔄",l:"Pipeline"},{id:"clientes",ico:"👥",l:"Clientes"},{id:"cotizaciones",ico:"📋",l:"Cotizaciones"}]} active={crmTab} set={v=>{setCrmTab(v);setShowClienteDetail(null);}} />
    <div style={{ marginTop: 12 }}>
      {/* CRM Metrics */}
      {!showClienteDetail && <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        <Card v={clientes.filter(c=>c.etapa!=="perdido").length} l="Activos" s={`${clientes.filter(c=>c.etapa==="ganado").length} ganados`} c={C.grn} ico="🎯" />
        <Card v={`${fmtI(clientes.reduce((s,c)=>s+(parseFloat(c.tons_potenciales)||0),0))}`} l="Tons Pot." c={C.pur} ico="📦" />
        <Card v={`$${fmtI(cotCRM.reduce((s,q)=>s+(q.total||0),0))}`} l="Cotizado" s={`${cotCRM.length} cots`} c={C.acc} ico="💰" />
      </div>}

      {/* Pipeline */}
      {crmTab === "pipeline" && !showClienteDetail && <>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><Btn text="+ Cliente" ico="👤" sm color={C.grn} onClick={()=>setShowAddCliente(true)} /></div>
        {STAGES.map(stg => {
          const sc = clientes.filter(c=>c.etapa===stg.id);
          if(!sc.length && stg.id==="perdido") return null;
          return <div key={stg.id} style={{marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:14}}>{stg.ico}</span>
              <span style={{fontSize:11,fontWeight:700,color:stg.c,textTransform:"uppercase"}}>{stg.l}</span>
              <Badge text={sc.length} color={stg.c} />
            </div>
            {sc.map(cl=>(
              <div key={cl.id} onClick={()=>setShowClienteDetail(cl.id)} style={{padding:10,background:C.s2,borderRadius:8,border:`1px solid ${stg.c}20`,marginBottom:4,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{cl.nombre}</div>
                  {cl.contacto && <div style={{fontSize:10,color:C.t3}}>{cl.contacto}{cl.ciudad&&` • ${cl.ciudad}`}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  {cl.tons_potenciales>0 && <div style={{fontSize:12,fontWeight:700,color:stg.c,fontFamily:"monospace"}}>{cl.tons_potenciales}t</div>}
                  <div style={{display:"flex",gap:2,marginTop:4}}>
                    {STAGES.filter(s=>s.id!==stg.id&&s.id!=="perdido").slice(0,3).map(s=>(
                      <button key={s.id} onClick={e=>{e.stopPropagation();updateCliente(cl.id,{etapa:s.id});}} style={{background:"transparent",border:`1px solid ${s.c}40`,color:s.c,fontSize:8,padding:"1px 4px",borderRadius:3,cursor:"pointer"}}>{s.ico}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {!sc.length && <div style={{padding:8,fontSize:11,color:C.t3,fontStyle:"italic"}}>Sin clientes</div>}
          </div>;
        })}
      </>}

      {/* Clientes List */}
      {crmTab === "clientes" && !showClienteDetail && <>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><Btn text="+ Cliente" ico="👤" sm color={C.grn} onClick={()=>setShowAddCliente(true)} /></div>
        {!clientes.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>👥 Sin clientes</div> :
          clientes.map(cl=>{
            const stg=STAGES.find(s=>s.id===cl.etapa);
            return <div key={cl.id} onClick={()=>setShowClienteDetail(cl.id)} style={{padding:12,background:C.s2,borderRadius:8,border:`1px solid ${C.brd}`,marginBottom:6,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:13,fontWeight:700}}>{cl.nombre}</div><div style={{fontSize:10,color:C.t3}}>{cl.contacto}{cl.ciudad&&` • ${cl.ciudad}`}</div></div>
                <div style={{textAlign:"right"}}><Badge text={stg?.l} color={stg?.c} /><div style={{fontSize:10,color:C.t3,marginTop:4}}>{cl.tons_potenciales||0}t</div></div>
              </div>
            </div>;
          })}
      </>}

      {/* Client Detail */}
      {showClienteDetail && (()=>{
        const cl=clientes.find(c=>c.id===showClienteDetail);
        if(!cl) return <div style={{textAlign:"center",padding:30,color:C.t3}}>Cliente no encontrado</div>;
        const stg=STAGES.find(s=>s.id===cl.etapa);
        const clCots=cotCRM.filter(q=>q.cliente_id===cl.id);
        const clActs=actividades.filter(a=>a.cliente_id===cl.id);
        return <>
          <button onClick={()=>{setShowClienteDetail(null);setEditingCliente(false);}} style={{background:"transparent",border:"none",color:C.acc,cursor:"pointer",fontSize:11,marginBottom:8,padding:0}}>← Volver</button>
          <Sec t={cl.nombre} ico={stg?.ico||"👤"} col={stg?.c} right={<div style={{display:"flex",gap:4}}>
            <Btn text="✏️" sm color={C.amb} outline onClick={()=>{setEditingCliente(true);setEditClienteData({nombre:cl.nombre||"",contacto:cl.contacto||"",email:cl.email||"",telefono:cl.telefono||"",ciudad:cl.ciudad||"",tons_potenciales:String(cl.tons_potenciales||0),notas:cl.notas||""});}} />
            <Btn text="🗑️" sm color={C.red} outline onClick={()=>{if(confirm(`¿Eliminar ${cl.nombre}?`)){deleteCliente(cl.id);}}} />
          </div>} ch={<>
            <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
              {STAGES.map(s=><button key={s.id} onClick={()=>updateCliente(cl.id,{etapa:s.id})} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",background:cl.etapa===s.id?s.c:"transparent",color:cl.etapa===s.id?"#fff":s.c,border:`1px solid ${s.c}40`}}>{s.ico} {s.l}</button>)}
            </div>
            {editingCliente ? <>
              <R ch={<F l="Empresa" w="100%" ch={<TxtInp v={editClienteData.nombre} set={v=>setEditClienteData(p=>({...p,nombre:v}))} ph="Nombre empresa" />} />} />
              <R ch={<><F l="Contacto" w="48%" ch={<TxtInp v={editClienteData.contacto} set={v=>setEditClienteData(p=>({...p,contacto:v}))} />} /><F l="Email" w="48%" ch={<TxtInp v={editClienteData.email} set={v=>setEditClienteData(p=>({...p,email:v}))} />} /></>} />
              <R ch={<><F l="Teléfono" w="48%" ch={<TxtInp v={editClienteData.telefono} set={v=>setEditClienteData(p=>({...p,telefono:v}))} />} /><F l="Ciudad" w="48%" ch={<TxtInp v={editClienteData.ciudad} set={v=>setEditClienteData(p=>({...p,ciudad:v}))} />} /></>} />
              <R ch={<F l="Tons Potenciales/Mes" w="48%" ch={<Inp v={editClienteData.tons_potenciales} set={v=>setEditClienteData(p=>({...p,tons_potenciales:v}))} />} />} />
              <R ch={<F l="Notas" w="100%" ch={<TxtInp v={editClienteData.notas} set={v=>setEditClienteData(p=>({...p,notas:v}))} ph="Notas sobre el cliente..." />} />} />
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <Btn text="💾 Guardar" color={C.grn} full onClick={async()=>{
                  const updates={nombre:editClienteData.nombre,contacto:editClienteData.contacto,email:editClienteData.email,telefono:editClienteData.telefono,ciudad:editClienteData.ciudad,tons_potenciales:parseFloat(editClienteData.tons_potenciales)||0,notas:editClienteData.notas,updated_at:new Date().toISOString(),updated_by:currentUser?.nombre||"Sistema"};
                  await updateCliente(cl.id,updates);
                  logActivity(`Cliente editado: ${updates.nombre}`,cl.id);
                  setEditingCliente(false);
                  showToast("Cliente actualizado");
                }} />
                <Btn text="Cancelar" color={C.t3} outline onClick={()=>setEditingCliente(false)} />
              </div>
            </> : <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                <div><span style={{color:C.t3}}>Contacto:</span> {cl.contacto||"—"}</div>
                <div><span style={{color:C.t3}}>Email:</span> {cl.email||"—"}</div>
                <div><span style={{color:C.t3}}>Tel:</span> {cl.telefono||"—"}</div>
                <div><span style={{color:C.t3}}>Ciudad:</span> {cl.ciudad||"—"}</div>
                <div><span style={{color:C.t3}}>Tons:</span> <span style={{color:C.pur,fontWeight:700}}>{cl.tons_potenciales||0}</span></div>
              </div>
              {cl.notas && <div style={{marginTop:8,padding:8,background:C.bg,borderRadius:6,fontSize:11,color:C.t2}}>{cl.notas}</div>}
              {cl.updated_by && <div style={{marginTop:6,fontSize:9,color:C.t3,fontStyle:"italic"}}>Última edición: {cl.updated_by} — {cl.updated_at?.split("T")[0]}</div>}
            </>}
          </>} />
          <Sec t={`Cotizaciones (${clCots.length})`} ico="📋" right={<Btn text="+" sm color={C.grn} onClick={()=>{setNewCotCRM(p=>({...p,cliente_id:cl.id}));setShowAddCotCRM(true);}} />} ch={<>
            {!clCots.length ? <div style={{textAlign:"center",padding:20,color:C.t3,fontSize:11}}>Sin cotizaciones</div> :
              clCots.map(q=><div key={q.id} onClick={()=>setEditCot({...q, items: q.items||[{producto:"",cantidad:"1000",precio_kg:"39"}], pago: q.pago||"90 días", notas: q.notas||""})} style={{padding:10,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",cursor:"pointer"}}>
                <div><span style={{fontSize:11,fontWeight:700,color:C.acc,fontFamily:"monospace"}}>{q.numero}</span><div style={{fontSize:10,color:C.t3}}>{q.fecha} • {q.pago}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>${fmtI(q.total)}</div><Badge text={q.status||"borrador"} color={q.status==="aceptada"?C.grn:q.status==="enviada"?C.amb:C.t3} /></div>
              </div>)}
          </>} />
          {clActs.length>0 && <Sec t="Actividad" ico="📝" ch={<>{clActs.slice(0,10).map(a=><div key={a.id} style={{padding:"4px 0",borderBottom:`1px solid ${C.brd}`,fontSize:11,color:C.t2}}><span style={{color:C.t3,marginRight:6}}>{a.fecha?.split("T")[0]}</span>{a.texto}</div>)}</>} />}
        </>;
      })()}

      {/* Cotizaciones CRM */}
      {crmTab === "cotizaciones" && !showClienteDetail && <>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><Btn text="+ Cotización" ico="📋" sm color={C.grn} onClick={()=>setShowAddCotCRM(true)} /></div>
        {!cotCRM.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>📋 Sin cotizaciones</div> :
          cotCRM.map(q=><div key={q.id} onClick={()=>setEditCot({...q, items: q.items||[{producto:"",cantidad:"1000",precio_kg:"39"}], pago: q.pago||"90 días", notas: q.notas||""})} style={{padding:12,background:C.s2,borderRadius:8,border:`1px solid ${C.brd}`,marginBottom:6,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><span style={{fontSize:12,fontWeight:700,color:C.acc,fontFamily:"monospace"}}>{q.numero}</span><div style={{fontSize:11,color:C.t2}}>{q.cliente_nombre}</div><div style={{fontSize:10,color:C.t3}}>{q.fecha} • {q.pago}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>${fmtI(q.total)}</div>
                <Badge text={q.status||"borrador"} color={q.status==="aceptada"?C.grn:q.status==="enviada"?C.amb:q.status==="rechazada"?C.red:C.t3} />
              </div>
            </div>
          </div>)}
      </>}
    </div>

    {/* Edit Cotización Modal */}
    {editCot && <Modal title={`Editar ${editCot.numero}`} onClose={()=>setEditCot(null)} ch={<>
      <R ch={<><F l="Cliente" w="58%" ch={<TxtInp v={editCot.cliente_nombre||""} set={v=>setEditCot(p=>({...p,cliente_nombre:v}))} />} /><F l="Status" w="38%" ch={<Sel v={editCot.status||"borrador"} set={v=>setEditCot(p=>({...p,status:v}))} opts={[{v:"borrador",l:"Borrador"},{v:"enviada",l:"Enviada"},{v:"aceptada",l:"Aceptada"},{v:"rechazada",l:"Rechazada"}]} />} /></>} />
      {(editCot.items||[]).map((it,i)=><R key={i} ch={<><F l="Producto" w="40%" ch={<TxtInp v={it.producto||""} set={v=>{const ni=[...(editCot.items||[])];ni[i]={...ni[i],producto:v};setEditCot(p=>({...p,items:ni}));}} />} /><F l="Kg" w="25%" ch={<Inp v={String(it.cantidad||"")} set={v=>{const ni=[...(editCot.items||[])];ni[i]={...ni[i],cantidad:v};setEditCot(p=>({...p,items:ni}));}} />} /><F l="$/kg" w="25%" ch={<Inp v={String(it.precio_kg||"")} set={v=>{const ni=[...(editCot.items||[])];ni[i]={...ni[i],precio_kg:v};setEditCot(p=>({...p,items:ni}));}} pre="$" />} /></>} />)}
      <Btn text="+ Producto" sm outline color={C.acc} onClick={()=>setEditCot(p=>({...p,items:[...(p.items||[]),{producto:"",cantidad:"1000",precio_kg:"39"}]}))} />
      <div style={{marginTop:8}}><R ch={<><F l="Pago" w="48%" ch={<Sel v={editCot.pago||"90 días"} set={v=>setEditCot(p=>({...p,pago:v}))} opts={["Anticipo 50%","30 días","60 días","90 días","Contra entrega"]} />} /><F l="Notas" w="48%" ch={<TxtInp v={editCot.notas||""} set={v=>setEditCot(p=>({...p,notas:v}))} />} /></>} /></div>
      <div style={{padding:8,background:`${C.grn}10`,borderRadius:6,marginBottom:10,textAlign:"right"}}>
        <span style={{fontSize:14,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>Total: ${fmtI((editCot.items||[]).reduce((s,i)=>s+(parseFloat(i.cantidad)||0)*(parseFloat(i.precio_kg)||0),0))}</span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn text={saving?"Guardando...":"💾 Guardar Cambios"} color={C.grn} full onClick={async()=>{
          setSaving(true);
          const items=(editCot.items||[]).map(it=>({...it,subtotal:(parseFloat(it.cantidad)||0)*(parseFloat(it.precio_kg)||0)}));
          const total=items.reduce((s,i)=>s+i.subtotal,0);
          const updates={items,total,status:editCot.status,pago:editCot.pago,notas:editCot.notas,cliente_nombre:editCot.cliente_nombre,updated_by:currentUser?.nombre||"Sistema",updated_at:new Date().toISOString()};
          setCotCRM(p=>p.map(c=>c.id===editCot.id?{...c,...updates}:c));
          try{await supabase.from('cotizaciones_crm').update(updates).eq('id',editCot.id);}catch{}
          showToast(`${editCot.numero} actualizada`);
          logActivity(`Cotización ${editCot.numero} editada — $${fmtI(total)}`,editCot.cliente_id);
          setEditCot(null);setSaving(false);
        }} disabled={saving} />
        <Btn text="🗑️" sm color={C.red} outline onClick={async()=>{
          if(!confirm(`¿Eliminar ${editCot.numero}?`)) return;
          setCotCRM(p=>p.filter(c=>c.id!==editCot.id));
          try{await supabase.from('cotizaciones_crm').delete().eq('id',editCot.id);}catch{}
          showToast(`${editCot.numero} eliminada`);
          logActivity(`Cotización ${editCot.numero} eliminada`,editCot.cliente_id);
          setEditCot(null);
        }} />
      </div>
    </>} />}

    {/* Add Cliente Modal */}
    {showAddCliente && <Modal title="+ Cliente" onClose={()=>setShowAddCliente(false)} ch={<>
      <R ch={<F l="Empresa *" w="100%" ch={<TxtInp v={newCliente.nombre} set={v=>setNewCliente(p=>({...p,nombre:v}))} ph="Nombre empresa" />} />} />
      <R ch={<><F l="Contacto" w="48%" ch={<TxtInp v={newCliente.contacto} set={v=>setNewCliente(p=>({...p,contacto:v}))} />} /><F l="Email" w="48%" ch={<TxtInp v={newCliente.email} set={v=>setNewCliente(p=>({...p,email:v}))} />} /></>} />
      <R ch={<><F l="Teléfono" w="48%" ch={<TxtInp v={newCliente.telefono} set={v=>setNewCliente(p=>({...p,telefono:v}))} />} /><F l="Ciudad" w="48%" ch={<TxtInp v={newCliente.ciudad} set={v=>setNewCliente(p=>({...p,ciudad:v}))} />} /></>} />
      <R ch={<><F l="Etapa" w="48%" ch={<Sel v={newCliente.etapa} set={v=>setNewCliente(p=>({...p,etapa:v}))} opts={STAGES.map(s=>({v:s.id,l:`${s.ico} ${s.l}`}))} />} /><F l="Tons Pot./Mes" w="48%" ch={<Inp v={newCliente.tons_potenciales} set={v=>setNewCliente(p=>({...p,tons_potenciales:v}))} />} /></>} />
      <R ch={<F l="Notas" w="100%" ch={<TxtInp v={newCliente.notas} set={v=>setNewCliente(p=>({...p,notas:v}))} ph="Notas sobre el cliente..." />} />} />
      <Btn text={saving?"Guardando...":"Crear Cliente"} ico="✓" color={C.grn} full onClick={async()=>{
        if(!newCliente.nombre) return;
        setSaving(true);
        let data; try { const r = await supabase.from('clientes').insert({...newCliente,tons_potenciales:parseFloat(newCliente.tons_potenciales)||0}).select(); data = r.data; } catch { data = [{...newCliente,id:genId(),tons_potenciales:parseFloat(newCliente.tons_potenciales)||0,created_at:new Date().toISOString()}]; }
        if(data?.[0]){setShowClienteDetail(null);showToast(`${newCliente.nombre} agregado`);logActivity(`Nuevo cliente: ${newCliente.nombre}`,data[0].id);}
        setShowAddCliente(false);setNewCliente({nombre:"",contacto:"",email:"",telefono:"",ciudad:"",etapa:"lead",notas:"",tons_potenciales:"0"});setSaving(false);
      }} disabled={saving} />
    </>} />}

    {/* Add Cotización CRM Modal */}
    {showAddCotCRM && <Modal title="+ Cotización CRM" onClose={()=>setShowAddCotCRM(false)} ch={<>
      <R ch={<F l="Cliente *" w="100%" ch={<Sel v={newCotCRM.cliente_id} set={v=>setNewCotCRM(p=>({...p,cliente_id:v}))} opts={clientes.map(c=>({v:c.id,l:c.nombre}))} ph="Seleccionar..." />} />} />
      {newCotCRM.items.map((it,i)=><R key={i} ch={<><F l="Producto" w="40%" ch={<TxtInp v={it.producto} set={v=>{const ni=[...newCotCRM.items];ni[i]={...ni[i],producto:v};setNewCotCRM(p=>({...p,items:ni}));}} />} /><F l="Kg" w="25%" ch={<Inp v={it.cantidad} set={v=>{const ni=[...newCotCRM.items];ni[i]={...ni[i],cantidad:v};setNewCotCRM(p=>({...p,items:ni}));}} />} /><F l="$/kg" w="25%" ch={<Inp v={it.precio_kg} set={v=>{const ni=[...newCotCRM.items];ni[i]={...ni[i],precio_kg:v};setNewCotCRM(p=>({...p,items:ni}));}} pre="$" />} /></>} />)}
      <Btn text="+ Producto" sm outline color={C.acc} onClick={()=>setNewCotCRM(p=>({...p,items:[...p.items,{producto:"",cantidad:"1000",precio_kg:"39"}]}))} />
      <div style={{marginTop:8}}><R ch={<><F l="Pago" w="48%" ch={<Sel v={newCotCRM.pago} set={v=>setNewCotCRM(p=>({...p,pago:v}))} opts={["Anticipo 50%","30 días","60 días","90 días","Contra entrega"]} />} /><F l="Notas" w="48%" ch={<TxtInp v={newCotCRM.notas} set={v=>setNewCotCRM(p=>({...p,notas:v}))} />} /></>} /></div>
      <div style={{padding:8,background:`${C.grn}10`,borderRadius:6,marginBottom:10,textAlign:"right"}}>
        <span style={{fontSize:14,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>Total: ${fmtI(newCotCRM.items.reduce((s,i)=>s+(parseFloat(i.cantidad)||0)*(parseFloat(i.precio_kg)||0),0))}</span>
      </div>
      <Btn text={saving?"Creando...":"Crear Cotización"} ico="✓" color={C.grn} full onClick={async()=>{
        if(!newCotCRM.cliente_id) return; setSaving(true);
        const cl=clientes.find(c=>c.id===newCotCRM.cliente_id);
        const items=newCotCRM.items.map(it=>({...it,subtotal:(parseFloat(it.cantidad)||0)*(parseFloat(it.precio_kg)||0)}));
        const total=items.reduce((s,i)=>s+i.subtotal,0);
        const numero=`KP-${String(cotCRM.length+1).padStart(4,"0")}`;
        const cotData={numero,cliente_id:newCotCRM.cliente_id,cliente_nombre:cl?.nombre,items,total,pago:newCotCRM.pago,notas:newCotCRM.notas,fecha:new Date().toISOString().split("T")[0],status:"borrador"};
        let data; try { const r = await supabase.from('cotizaciones_crm').insert(cotData).select(); data = r.data; } catch { data = [{...cotData,id:genId()}]; }
        if(data?.[0]){setCotCRM(p=>[data[0],...p]);if(cl&&["lead","contactado"].includes(cl.etapa)){updateCliente(cl.id,{etapa:"cotizado"});}showToast(`${numero} creada`);logActivity(`Cotización ${numero} — $${fmtI(total)}`,cl?.id);}
        setShowAddCotCRM(false);setNewCotCRM({cliente_id:"",items:[{producto:"PE 60/15",cantidad:"1000",precio_kg:"39"}],pago:"90 días",notas:""});setSaving(false);
      }} disabled={saving} />
    </>} />}
  </>;
}
