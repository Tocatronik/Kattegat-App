import { C } from '../utils/constants';
import { TxtInp, F, R, Sec, Btn, Modal } from '../components/ui';

export default function Proveedores({
  proveedores, showAddProv, setShowAddProv, newProv, setNewProv,
  editProv, setEditProv, addProveedor, startEditProv, deleteProveedor, saving,
}) {
  return <>
    <Sec t={`Proveedores (${proveedores.length})`} ico="🏢" right={<Btn text="+ Proveedor" sm color={C.grn} onClick={() => setShowAddProv(true)} />}
      ch={<>
        {!proveedores.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>🏢 Sin proveedores. Agrega el primero.</div> :
          proveedores.map((p, i) => (
            <div key={p.id||i} style={{ padding: 12, background: C.bg, borderRadius: 8, marginBottom: 6, border: `1px solid ${C.brd}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{p.nombre}</div>
                  {p.rfc && <div style={{ fontSize: 11, color: C.acc, fontFamily: "monospace", marginTop: 2 }}>RFC: {p.rfc}</div>}
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.t3, marginTop: 4, flexWrap: "wrap" }}>
                    {p.contacto && <span>👤 {p.contacto}</span>}
                    {p.telefono && <span>📞 {p.telefono}</span>}
                    {p.correo && <span>📧 {p.correo}</span>}
                  </div>
                  {p.notas && <div style={{ fontSize: 11, color: C.t3, marginTop: 4, fontStyle: "italic" }}>{p.notas}</div>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEditProv(p)} style={{ background: "none", border: "none", color: C.acc, cursor: "pointer", fontSize: 14 }}>✏️</button>
                  <button onClick={() => deleteProveedor(p.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
      </>} />
    {showAddProv && <Modal title={editProv ? "✏️ Editar Proveedor" : "+ Proveedor"} onClose={() => { setShowAddProv(false); setEditProv(null); setNewProv({ nombre: "", rfc: "", contacto: "", correo: "", telefono: "", notas: "" }); }} ch={<>
      <R ch={<><F l="Nombre *" w="58%" ch={<TxtInp v={newProv.nombre} set={v => setNewProv(p => ({...p, nombre: v}))} ph="Ej: Clariant, Dow..." />} /><F l="RFC" w="38%" ch={<TxtInp v={newProv.rfc} set={v => setNewProv(p => ({...p, rfc: v.toUpperCase()}))} ph="XXX000000XX0" />} /></>} />
      <R ch={<><F l="Contacto" w="48%" ch={<TxtInp v={newProv.contacto} set={v => setNewProv(p => ({...p, contacto: v}))} ph="Nombre contacto" />} /><F l="Teléfono" w="48%" ch={<TxtInp v={newProv.telefono} set={v => setNewProv(p => ({...p, telefono: v}))} ph="55 1234 5678" />} /></>} />
      <R ch={<F l="Correo" w="100%" ch={<TxtInp v={newProv.correo} set={v => setNewProv(p => ({...p, correo: v}))} ph="ventas@proveedor.com" />} />} />
      <R ch={<F l="Notas" w="100%" ch={<TxtInp v={newProv.notas} set={v => setNewProv(p => ({...p, notas: v}))} ph="Materias primas, condiciones, etc." />} />} />
      <Btn text={saving ? "Guardando..." : editProv ? "Actualizar Proveedor" : "Guardar Proveedor"} ico="✓" color={C.grn} full onClick={addProveedor} disabled={saving || !newProv.nombre} />
    </>} />}
  </>;
}
