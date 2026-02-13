import { C } from '../utils/constants';
import { fmtI, fmt } from '../utils/helpers';
import { calcNomina } from '../utils/calcNomina';
import { Inp, TxtInp, Sel, F, R, RR, Sec, Badge, Btn, Tab, Modal, Card } from '../components/ui';

export default function Nominas({
  nomTab, setNomTab, nominaTotal, empleados,
  showAddEmpleado, setShowAddEmpleado, newEmp, setNewEmp,
  editEmpleado, setEditEmpleado, expandedEmp, setExpandedEmp,
  addEmpleado, startEditEmp, toggleEmpleadoActivo, saving,
  oh, setOh, supabase, currentUser, showToast,
}) {
  return <>
    <Tab tabs={[{ id: "empleados", ico: "👥", l: "Empleados" }, { id: "resumen", ico: "📊", l: "Resumen" }]} active={nomTab} set={setNomTab} />
    <div style={{ marginTop: 12 }}>
      {nomTab === "empleados" && <>
        <Sec t={`Plantilla (${nominaTotal.count})`} ico="👥" right={<Btn text="+" sm color={C.grn} onClick={() => { setEditEmpleado(null); setNewEmp({ nombre: "", puesto: "Operador Extrusora", sueldo_bruto: "14000" }); setShowAddEmpleado(true); }} />}
          ch={<>{nominaTotal.detalles.map((emp, i) => {
            const expanded = expandedEmp === emp.id;
            return <div key={emp.id||i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 6, border: `1px solid ${C.brd}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{emp.nombre}</div>
                  <div style={{ fontSize: 10, color: C.t3 }}>{emp.puesto}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => startEditEmp(emp)} style={{ background: "none", border: "none", color: C.acc, cursor: "pointer", fontSize: 12 }}>✏️</button>
                  <button onClick={() => toggleEmpleadoActivo(emp.id, emp.activo)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 12 }}>{emp.activo ? "⏸️" : "▶️"}</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 10, marginTop: 6 }}>
                <div onClick={() => setExpandedEmp(expanded ? null : emp.id)} style={{ padding: 6, background: C.s2, borderRadius: 4, textAlign: "center", cursor: "pointer", border: expanded ? `1px solid ${C.grn}40` : "none" }}>
                  <div style={{ color: C.t3 }}>Neto {expanded ? "▲" : "▼"}</div>
                  <div style={{ fontWeight: 700, color: C.grn, fontFamily: "monospace" }}>${fmtI(emp.calc.sn)}</div>
                </div>
                <div style={{ padding: 6, background: C.s2, borderRadius: 4, textAlign: "center" }}>
                  <div style={{ color: C.t3 }}>Bruto</div>
                  <div style={{ fontWeight: 700, color: C.amb, fontFamily: "monospace" }}>${fmtI(emp.calc.sueldoBruto)}</div>
                </div>
                <div style={{ padding: 6, background: C.s2, borderRadius: 4, textAlign: "center" }}>
                  <div style={{ color: C.t3 }}>Costo Emp.</div>
                  <div style={{ fontWeight: 700, color: C.red, fontFamily: "monospace" }}>${fmtI(emp.calc.costoConProv)}</div>
                </div>
              </div>
              {expanded && <div style={{ marginTop: 8, padding: 8, background: C.s2, borderRadius: 6, fontSize: 10 }}>
                <div style={{ fontWeight: 700, color: C.amb, marginBottom: 4 }}>📋 Deducciones Empleado (mensual)</div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>ISR (retención)</span><span style={{ color: C.red }}>-${fmtI(emp.calc.isr)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Enf/Mat prestaciones</span><span style={{ color: C.red }}>-${fmt(emp.calc.imssEmpEnfMatPrest)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Gastos médicos</span><span style={{ color: C.red }}>-${fmt(emp.calc.imssEmpEnfMatGastos)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Invalidez y Vida</span><span style={{ color: C.red }}>-${fmt(emp.calc.imssEmpInvalidez)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Cesantía y Vejez</span><span style={{ color: C.red }}>-${fmt(emp.calc.imssEmpCesantia)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: `1px solid ${C.brd}`, marginTop: 4, fontWeight: 700 }}><span style={{ color: C.t2 }}>Total deducciones</span><span style={{ color: C.red }}>-${fmtI(emp.calc.deducciones)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: 700 }}><span style={{ color: C.t2 }}>= Neto a recibir</span><span style={{ color: C.grn }}>${fmtI(emp.calc.sn)}</span></div>
                <div style={{ fontWeight: 700, color: C.pur, marginTop: 10, marginBottom: 4 }}>🏢 Cargas Patronales</div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Riesgo de Trabajo</span><span>${fmt(emp.calc.imssPatRiesgo)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Enf/Mat especie</span><span>${fmt(emp.calc.imssPatEnfMatEsp)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Enf/Mat dinero</span><span>${fmt(emp.calc.imssPatEnfMatDinero)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Prestaciones</span><span>${fmt(emp.calc.imssPatEnfMatPrest)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Gastos médicos</span><span>${fmt(emp.calc.imssPatEnfMatGastos)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Invalidez y Vida</span><span>${fmt(emp.calc.imssPatInvalidez)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>IMSS Guarderías</span><span>${fmt(emp.calc.imssPatGuarderia)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>SAR (Retiro)</span><span>${fmt(emp.calc.imssPatRetiro)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>Cesantía y Vejez patron.</span><span>${fmt(emp.calc.imssPatCesantia)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>Infonavit (5%)</span><span>${fmt(emp.calc.infonavit)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>ISN (3% nómina)</span><span>${fmt(emp.calc.isn)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: `1px solid ${C.brd}`, marginTop: 4, fontWeight: 700 }}><span style={{ color: C.t2 }}>Total patronal</span><span style={{ color: C.pur }}>${fmtI(emp.calc.costoPatronal)}</span></div>
                <div style={{ fontWeight: 700, color: C.cyn, marginTop: 10, marginBottom: 4 }}>📅 Provisiones Mensuales</div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>Aguinaldo (15 días/12)</span><span>${fmt(emp.calc.aguinaldo)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.t3 }}>Prima Vacacional</span><span>${fmt(emp.calc.primaVac)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: `1px solid ${C.brd}`, marginTop: 4, fontWeight: 700 }}><span>COSTO TOTAL EMPRESA</span><span style={{ color: C.red, fontSize: 13 }}>${fmtI(emp.calc.costoConProv)}</span></div>
                <div style={{ fontSize: 9, color: C.t3, marginTop: 4 }}>SBC: ${fmt(emp.calc.sbc)}/día | Factor: {emp.calc.factorInt}</div>
              </div>}
            </div>;
          })}</>}
        />
        {showAddEmpleado && <Modal title={editEmpleado ? "✏️ Editar Empleado" : "+ Empleado"} onClose={() => { setShowAddEmpleado(false); setEditEmpleado(null); }} ch={<>
          <R ch={<F l="Nombre" w="100%" ch={<TxtInp v={newEmp.nombre} set={v => setNewEmp(p => ({...p, nombre: v}))} />} />} />
          <R ch={<><F l="Puesto" w="58%" ch={<Sel v={newEmp.puesto} set={v => setNewEmp(p => ({...p, puesto: v}))} opts={["Operador Extrusora", "Ayudante General", "Supervisor", "Gerente"]} />} /><F l="Sueldo Bruto" w="38%" ch={<Inp v={newEmp.sueldo_bruto} set={v => setNewEmp(p => ({...p, sueldo_bruto: v}))} pre="$" />} /></>} />
          {newEmp.sueldo_bruto && <div style={{ padding: 8, background: `${C.grn}10`, borderRadius: 6, fontSize: 10, color: C.t2, marginTop: 4 }}>
            Neto estimado: <b style={{color:C.grn}}>${fmtI(calcNomina(parseFloat(newEmp.sueldo_bruto)||0).sn)}</b> | Costo empresa: <b style={{color:C.red}}>${fmtI(calcNomina(parseFloat(newEmp.sueldo_bruto)||0).costoConProv)}</b>
          </div>}
          <Btn text={saving ? "Guardando..." : editEmpleado ? "Actualizar" : "Agregar"} ico="✓" color={C.grn} full onClick={addEmpleado} disabled={saving || !newEmp.nombre} />
        </>} />}
      </>}
      {nomTab === "resumen" && <Sec t="Resumen Mensual" ico="📊" ch={<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <Card v={`$${fmtI(nominaTotal.totalNeto)}`} l="Neto (pago)" c={C.grn} ico="💵" />
          <Card v={`$${fmtI(nominaTotal.totalBruto)}`} l="Bruto" c={C.amb} ico="📋" />
          <Card v={`$${fmtI(nominaTotal.totalCosto)}`} l="Costo Real" c={C.red} ico="💰" />
        </div>
        <RR l="Empleados activos" v={nominaTotal.count} b />
        <RR l="Total bruto mensual" v={nominaTotal.totalBruto} b c={C.amb} />
        <RR l="Total cargas patronales" v={nominaTotal.totalPatronal} b c={C.pur} />
        <RR l="Costo mensual con provisiones" v={nominaTotal.totalCosto} b c={C.red} />
        <RR l="Costo anual estimado" v={nominaTotal.totalCosto * 12} b c={C.red} />
        <div style={{ marginTop: 12, padding: 10, background: `${C.grn}10`, borderRadius: 8, border: `1px solid ${C.grn}30` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.grn, marginBottom: 4 }}>🔗 Overhead Sincronizado</div>
          <div style={{ fontSize: 10, color: C.t2 }}>MO Directa en Overhead: <b style={{color:C.grn}}>${fmtI(oh.mo_directa)}</b></div>
          <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>Se actualiza automáticamente al editar empleados</div>
          {Math.round(nominaTotal.totalCosto) !== Math.round(oh.mo_directa || 0) && nominaTotal.totalCosto > 0 && (
            <Btn text="Forzar Sincronización" sm color={C.amb} onClick={async () => {
              const newOh = { ...oh, mo_directa: Math.round(nominaTotal.totalCosto) };
              setOh(newOh);
              await supabase.from('configuracion').upsert({ clave: 'overhead', valor: newOh, updated_by: currentUser?.nombre, updated_at: new Date().toISOString() });
              showToast("Overhead sincronizado manualmente");
            }} />
          )}
        </div>
      </>} />}
    </div>
  </>;
}
