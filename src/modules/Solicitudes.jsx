import { C } from '../utils/constants';
import { Sec, Badge, Btn } from '../components/ui';

export default function Solicitudes({ solicitudes, pendingSolicitudes, resolverSolicitud }) {
  return <>
    <Sec t={`Pendientes (${pendingSolicitudes.length})`} ico="🔴" col={pendingSolicitudes.length?C.red:C.brd} ch={<>
      {!pendingSolicitudes.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>✅ Sin solicitudes pendientes</div> :
        pendingSolicitudes.map(s=>(
          <div key={s.id} style={{padding:12,background:C.bg,borderRadius:8,marginBottom:6,border:`1px solid ${C.amb}40`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div>
                <span style={{fontSize:12,fontWeight:700,fontFamily:"monospace",color:C.amb}}>{s.registro_codigo}</span>
                <Badge text={s.tipo} color={C.pur} />
              </div>
              <span style={{fontSize:9,color:C.t3}}>{s.created_at?.split("T")[0]}</span>
            </div>
            <div style={{fontSize:12,color:C.t1,marginBottom:4}}>"{s.motivo}"</div>
            <div style={{fontSize:10,color:C.t3,marginBottom:8}}>Solicitó: {s.solicitante}</div>
            <div style={{display:"flex",gap:8}}>
              <Btn text="✅ Aprobar" sm color={C.grn} onClick={()=>resolverSolicitud(s.id,"aprobada")} />
              <Btn text="❌ Rechazar" sm color={C.red} outline onClick={()=>resolverSolicitud(s.id,"rechazada")} />
            </div>
          </div>
        ))}
    </>} />
    <Sec t={`Historial (${solicitudes.filter(s=>s.status!=="pendiente").length})`} ico="📋" ch={<>
      {solicitudes.filter(s=>s.status!=="pendiente").slice(0,20).map(s=>(
        <div key={s.id} style={{padding:8,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <span style={{fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{s.registro_codigo}</span>
            <div style={{fontSize:10,color:C.t3}}>{s.motivo}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <Badge text={s.status} color={s.status==="aprobada"?C.grn:C.red} />
            <div style={{fontSize:9,color:C.t3,marginTop:2}}>{s.resuelto_por}</div>
          </div>
        </div>
      ))}
    </>} />
  </>;
}
