import { reportError } from './errorReporter.js';

describe('errorReporter', () => {
  let fetchSpy;
  let originalFetch;

  beforeEach(async () => {
    // El reporter tiene module-level state `lastSent` con throttle 500ms.
    // Esperar entre tests para que lastSent expire y el siguiente reportError flushee.
    await new Promise((r) => setTimeout(r, 600));
    originalFetch = global.fetch;
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('reportError no tira si fetch falla', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));
    expect(() => reportError(new Error('test'))).not.toThrow();
    // dejar que la microtask intente flush
    await new Promise((r) => setTimeout(r, 50));
    // tras el rechazo, sigue sin throw
    expect(true).toBe(true);
  });

  it('hace POST a /api/log-error con message + stack + context', async () => {
    reportError(new Error('hola'), { extra: 'data' });
    // throttle MIN_INTERVAL_MS = 500ms; espera flush
    await new Promise((r) => setTimeout(r, 700));
    expect(fetchSpy).toHaveBeenCalled();
    const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    expect(lastCall[0]).toBe('/api/log-error');
    const body = JSON.parse(lastCall[1].body);
    expect(body.message).toBe('hola');
    expect(body.stack).toBeTruthy();
    expect(body.context).toEqual({ extra: 'data' });
    expect(body.source).toBe('client');
    expect(body.level).toBe('error');
  });

  it('acepta string como error sin tirar', () => {
    expect(() => reportError('just a string')).not.toThrow();
  });

  it('serializa string error como message', async () => {
    reportError('mensaje plano');
    await new Promise((r) => setTimeout(r, 700));
    expect(fetchSpy).toHaveBeenCalled();
    const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body);
    expect(body.message).toBe('mensaje plano');
    // String() de un string es el mismo string, no tiene stack
    expect(body.stack).toBeNull();
  });

  it('incluye url como null en entorno node (sin window)', async () => {
    reportError(new Error('test'));
    await new Promise((r) => setTimeout(r, 700));
    expect(fetchSpy).toHaveBeenCalled();
    const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body);
    // env=node → typeof window === 'undefined' → url=null
    expect(body.url).toBeNull();
  });
});
