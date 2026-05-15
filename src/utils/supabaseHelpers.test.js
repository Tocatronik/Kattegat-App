import { sb } from './supabaseHelpers.js';

describe('sb()', () => {
  beforeEach(() => {
    // silenciar console.error en el path de error feliz
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve data si no hay error', async () => {
    const promise = Promise.resolve({ data: { id: 1 }, error: null });
    await expect(sb(promise)).resolves.toEqual({ id: 1 });
  });

  it('devuelve array de data si la query retorna array', async () => {
    const promise = Promise.resolve({ data: [{ id: 1 }, { id: 2 }], error: null });
    await expect(sb(promise)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('lanza Error si la respuesta trae error con message', async () => {
    const promise = Promise.resolve({ data: null, error: { message: 'duplicate key' } });
    await expect(sb(promise)).rejects.toThrow('duplicate key');
  });

  it('lanza con errMsg default si error no tiene message', async () => {
    const promise = Promise.resolve({ data: null, error: { code: '42P01' } });
    await expect(sb(promise)).rejects.toThrow('Error en la base de datos');
  });

  it('lanza con errMsg custom si error.message es undefined y se pasó errMsg', async () => {
    const promise = Promise.resolve({ data: null, error: {} });
    await expect(sb(promise, 'falló al cargar X')).rejects.toThrow('falló al cargar X');
  });

  it('preserva error.message sobre errMsg custom (mensaje del servidor gana)', async () => {
    const promise = Promise.resolve({ data: null, error: { message: 'server says no' } });
    await expect(sb(promise, 'falló al cargar X')).rejects.toThrow('server says no');
  });

  it('loguea a console.error cuando hay error', async () => {
    const errSpy = console.error;
    const promise = Promise.resolve({ data: null, error: { message: 'fail' } });
    await expect(sb(promise, 'contexto')).rejects.toThrow();
    expect(errSpy).toHaveBeenCalled();
  });
});
