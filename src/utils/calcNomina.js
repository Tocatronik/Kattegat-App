// ─── NÓMINA CALC (LFT + IMSS 2026) ───
export const calcNomina = (sueldoBrutoInput) => {
  const sb = parseFloat(sueldoBrutoInput) || 0;
  const diario = sb / 30;
  // SBC (Salario Base Cotización) = diario * factor integración (1 año antigüedad)
  const factorInt = 1.0493; // 15 días aguinaldo + 12 días vacaciones * 25% prima
  const sbc = diario * factorInt;
  const sbcMensual = sbc * 30;

  // ─── DEDUCCIONES EMPLEADO ───
  // ISR: tabla simplificada por rango mensual (2024-2026)
  let isr = 0;
  if (sb <= 7735) isr = sb * 0.0192;
  else if (sb <= 15487) isr = 148.51 + (sb - 7735.01) * 0.064;
  else if (sb <= 21381) isr = 644.40 + (sb - 15487.71) * 0.1088;
  else if (sb <= 24885) isr = 1285.49 + (sb - 21381.15) * 0.16;
  else if (sb <= 42537) isr = 1845.98 + (sb - 24885.15) * 0.1792;
  else isr = sb * 0.21; // simplificado para salarios altos

  // IMSS Empleado
  const imssEmpEnfMatPrest = sbcMensual * 0.0025; // Enf y Mat prestaciones
  const imssEmpEnfMatGastos = sbcMensual * 0.004; // Gastos médicos
  const imssEmpInvalidez = sbcMensual * 0.00625; // Invalidez y Vida
  const imssEmpCesantia = sbcMensual * 0.01125; // Cesantía y Vejez
  const imssEmpleadoTotal = imssEmpEnfMatPrest + imssEmpEnfMatGastos + imssEmpInvalidez + imssEmpCesantia;

  const deducciones = isr + imssEmpleadoTotal;
  const sn = sb - deducciones; // Neto

  // ─── CARGAS PATRONALES ───
  // IMSS Patronal
  const imssPatRiesgo = sbcMensual * 0.01105; // Riesgo de trabajo (clase II)
  const imssPatEnfMatEsp = sbcMensual * 0.0105; // Enf y Mat especie
  const imssPatEnfMatDinero = sbcMensual * 0.007; // Enf y Mat dinero
  const imssPatEnfMatPrest = sbcMensual * 0.0070; // Prestaciones
  const imssPatEnfMatGastos = sbcMensual * 0.01050; // Gastos médicos
  const imssPatInvalidez = sbcMensual * 0.01750; // Invalidez y Vida
  const imssPatGuarderia = sbcMensual * 0.01; // Guarderías
  const imssPatRetiro = sbcMensual * 0.02; // Retiro (SAR)
  const imssPatCesantia = sbcMensual * 0.03150; // Cesantía y Vejez
  const imssPatronalTotal = imssPatRiesgo + imssPatEnfMatEsp + imssPatEnfMatDinero + imssPatEnfMatPrest + imssPatEnfMatGastos + imssPatInvalidez + imssPatGuarderia + imssPatRetiro + imssPatCesantia;

  const infonavit = sbcMensual * 0.05; // 5% patronal
  const isn = sb * 0.03; // ISN (Impuesto sobre Nómina, varía por estado ~2-3%)

  // Provisiones mensuales
  const aguinaldo = sb * 15 / 365;
  const diasVac = 12; // 1 año antigüedad
  const primaVac = (sb * diasVac / 365) * 0.25;
  const provMensual = aguinaldo + primaVac;

  const costoPatronal = imssPatronalTotal + infonavit + isn;
  const costoTotal = sb + costoPatronal;
  const costoConProv = costoTotal + provMensual;

  return {
    sn, sueldoBruto: sb, isr, sbc, sbcMensual, factorInt,
    // Deducciones empleado
    imssEmpleadoTotal, imssEmpEnfMatPrest, imssEmpEnfMatGastos, imssEmpInvalidez, imssEmpCesantia,
    deducciones,
    // Cargas patronales
    imssPatronalTotal, imssPatRiesgo, imssPatEnfMatEsp, imssPatEnfMatDinero, imssPatEnfMatPrest, imssPatEnfMatGastos, imssPatInvalidez, imssPatGuarderia, imssPatRetiro, imssPatCesantia,
    infonavit, isn,
    costoPatronal, costoTotal,
    aguinaldo, primaVac, provMensual, costoConProv
  };
};
