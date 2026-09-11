export async function readApiResponse<T>(response: Response): Promise<T> {
  const fallback = `Não foi possível concluir a solicitação (HTTP ${response.status}). Tente novamente.`;
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(fallback);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(fallback);
  }
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : fallback);
  }
  return data as T;
}
