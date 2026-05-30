/** Parse JSON from a fetch Response without throwing on empty bodies. */
export async function readResponseJson<T extends Record<string, unknown>>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Server returned an invalid response. Please try again."
        : `Request failed (${response.status}). Please try again.`,
    );
  }
}
