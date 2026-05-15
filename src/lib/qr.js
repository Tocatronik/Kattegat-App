// QR helpers — generación de códigos QR de trazabilidad.
// Dynamic import de `qrcode` para mantenerlo fuera del bundle inicial.

/**
 * Genera data URL (PNG base64) de un QR que apunta a la URL de trazabilidad
 * de una bobina. Devuelve null si falla (no fatal, el caller decide qué hacer).
 *
 * @param {{ id: string|number }} bobina
 * @returns {Promise<string|null>}
 */
export async function generateTraceQR(bobina) {
  const traceUrl = `${window.location.origin}#trace/${bobina.id}`;
  try {
    const { default: QRCode } = await import('qrcode');
    const qr = await QRCode.toDataURL(traceUrl, {
      width: 300,
      margin: 1,
      color: { dark: '#0B0F1A', light: '#FFFFFF' },
    });
    return qr;
  } catch (e) {
    console.warn('[generateTraceQR] failed:', e);
    return null;
  }
}

/**
 * Genera un QR genérico para una URL arbitraria. Útil dentro de PDFs cuando
 * solo necesitas el data URL sin la lógica de "trace bobina".
 *
 * @param {string} url
 * @param {object} [options] — pasa opciones a QRCode.toDataURL (width, margin, color, etc.)
 * @returns {Promise<string|null>}
 */
export async function generateQR(url, options = {}) {
  try {
    const { default: QRCode } = await import('qrcode');
    return await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      ...options,
    });
  } catch (e) {
    console.warn('[generateQR] failed:', e);
    return null;
  }
}
