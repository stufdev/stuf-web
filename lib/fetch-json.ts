export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = '';
    try {
      const payload = (await response.json()) as { error?: string };
      detail = payload.error ? `: ${payload.error}` : '';
    } catch {
      detail = '';
    }

    throw new Error(`Request failed with ${response.status}${detail}`);
  }

  return (await response.json()) as T;
}
