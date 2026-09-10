export function browserAuthStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
