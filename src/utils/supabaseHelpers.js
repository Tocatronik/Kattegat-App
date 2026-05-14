/**
 * Wraps a supabase query that returns { data, error }.
 * Throws on error so caller can catch and toast.
 */
export async function sb(promise, errMsg = 'Error en la base de datos') {
  const { data, error } = await promise;
  if (error) {
    console.error(`[supabase] ${errMsg}:`, error);
    throw new Error(error.message || errMsg);
  }
  return data;
}
