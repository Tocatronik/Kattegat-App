import { C } from '../utils/constants';
import { TxtInp, DateInp, Sel, F, R, Sec, Btn } from '../components/ui';

export default function ActividadLog({ actividades, clientes, actLogFilter, setActLogFilter }) {
  const filteredActs = actividades.filter(a => {
    if (actLogFilter.cliente && a.cliente_id !== actLogFilter.cliente) return false;
    if (actLogFilter.buscar && !a.texto?.toLowerCase().includes(actLogFilter.buscar.toLowerCase())) return false;
    if (actLogFilter.fecha && a.fecha?.split("T")[0] !== actLogFilter.fecha) return false;
    return true;
  });
  return <>
    <Sec t="Filtros" ico="🔍" ch={<>
      <R ch={<><F l="Buscar" w="48%" ch={<TxtInp v={actLogFilter.buscar} set={v=>setActLogFilter(p=>({...p,buscar:v}))} ph="Buscar en log..." />} /><F l="Fecha" w="48%" ch={<DateInp v={actLogFilter.fecha} set={v=>setActLogFilter(p=>({...p,fecha:v}))} />} /></>} />
      <R ch={<><F l="Cliente" w="48%" ch={<Sel v={actLogFilter.cliente} set={v=>setActLogFilter(p=>({...p,cliente:v}))} opts={[{v:"",l:"Todos"},...clientes.map(c=>({v:c.id,l:c.nombre}))]} />} /><F l="" w="48%" ch={<Btn text="Limpiar filtros" sm outline color={C.t3} onClick={()=>setActLogFilter({buscar:"",cliente:"",fecha:""})} />} /></>} />
    </>} />
    <Sec t={`Actividad (${filteredActs.length})`} ico="📝" ch={<>
      {!filteredActs.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>📝 Sin actividad con estos filtros</div> :
        filteredActs.slice(0, 50).map(a => {
          const clName = a.cliente_id ? clientes.find(c=>c.id===a.cliente_id)?.nombre : null;
          return (
            <div key={a.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.brd}`}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:a.texto?.includes("eliminad")?C.red:a.texto?.includes("Cotización")?C.grn:a.texto?.includes("editad")?C.amb:C.acc,marginTop:5,flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:C.t1}}>{a.texto}</div>
                <div style={{display:"flex",gap:8,fontSize:10,color:C.t3,marginTop:2,flexWrap:"wrap"}}>
                  <span>{a.fecha?.split("T")[0]}</span>
                  <span>👤 {a.usuario}</span>
                  {clName && <span style={{color:C.acc}}>🏢 {clName}</span>}
                </div>
              </div>
            </div>
          );
        })}
    </>} />
  </>;
}
