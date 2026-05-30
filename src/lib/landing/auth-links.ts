/** Primary workspace entry after sign-in. */
export const SENTRA_HOME = "/dashboard";

export function signInFor(path: string) {
  return `/sign-in?next=${encodeURIComponent(path)}`;
}
