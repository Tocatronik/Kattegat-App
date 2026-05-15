import { fmt, fmtI, today, daysDiff } from './format.js';

describe('format', () => {
  describe('fmt', () => {
    it('formatea número con separador de miles', () => {
      // es-MX usa coma como separador de miles y punto como decimal
      expect(fmt(1234567)).toMatch(/1[.,]234[.,]567/);
    });

    it('respeta decimales', () => {
      const r = fmt(1234.56);
      expect(r).toContain('1');
      expect(r).toContain('234');
      // valor con decimales legibles
      expect(r).toMatch(/56/);
    });

    it('maneja null devolviendo string default', () => {
      expect(fmt(null)).toBe('0.00');
    });

    it('maneja undefined devolviendo string default', () => {
      expect(fmt(undefined)).toBe('0.00');
    });

    it('maneja 0', () => {
      expect(fmt(0)).toMatch(/0/);
    });

    it('respeta cantidad de decimales custom', () => {
      const r = fmt(1.5, 4);
      // 4 decimales: 1.5000
      expect(r).toMatch(/1[.,]5000/);
    });

    it('default es 2 decimales', () => {
      expect(fmt(1)).toMatch(/1[.,]00/);
    });
  });

  describe('fmtI', () => {
    it('formatea entero con separador de miles', () => {
      expect(fmtI(1234)).toMatch(/1[.,]234/);
    });

    it('redondea floats', () => {
      const r = fmtI(1234.6);
      // toLocaleString con maximumFractionDigits 0 usa rounding
      expect(r).toMatch(/1[.,]235|1[.,]234/);
    });

    it('maneja null devolviendo "0"', () => {
      expect(fmtI(null)).toBe('0');
    });

    it('maneja undefined devolviendo "0"', () => {
      expect(fmtI(undefined)).toBe('0');
    });
  });

  describe('today', () => {
    it('retorna YYYY-MM-DD del día actual', () => {
      const t = today();
      expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('coincide con la fecha UTC de hoy', () => {
      const expected = new Date().toISOString().split('T')[0];
      expect(today()).toBe(expected);
    });
  });

  describe('daysDiff', () => {
    it('calcula diferencia positiva entre dos fechas', () => {
      const d = daysDiff('2026-01-15', '2026-01-01');
      expect(d).toBe(14);
    });

    it('retorna 0 para la misma fecha', () => {
      expect(daysDiff('2026-01-01', '2026-01-01')).toBe(0);
    });

    it('retorna negativo si d1 < d2', () => {
      const d = daysDiff('2026-01-01', '2026-01-15');
      expect(d).toBe(-14);
    });

    it('redondea hacia arriba (Math.ceil)', () => {
      // 1.5 días debería redondear a 2
      const d = daysDiff('2026-01-02T12:00:00Z', '2026-01-01T00:00:00Z');
      expect(d).toBe(2);
    });
  });
});
