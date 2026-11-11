import { currentToken } from "./platform";
// This public origin is embedded during the shared web/native build. Developers
// can explicitly override it with NEXT_PUBLIC_API_URL for a local API.
export const API = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://taskflow-backend-ouuj.onrender.com"
    : "http://localhost:4000");
if (
  process.env.NODE_ENV === "production" &&
  !API.startsWith("https://") &&
  !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API)
)
  throw new Error("Production API must use HTTPS.");
export async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const result = await fetch(`${API}/api/v1${path}`, {
    ...options,
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-TaskFlow-Request": "1",
      ...(currentToken() ? { Authorization: `Bearer ${currentToken()}` } : {}),
      ...options.headers,
    },
  });
  if (!result.ok) {
    const data = await result.json().catch(() => null);
    if (result.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    const details = data?.error?.details
      ?.map((x: any) => `${x.path}: ${x.message}`)
      .join(" ");
    throw new Error(
      details || data?.error?.message || `Request failed (${result.status}).`,
    );
  }
  const data = await result.json();
  if (!['GET','HEAD'].includes((options.method || 'GET').toUpperCase()))
    window.dispatchEvent(new Event('taskflow:data-changed'));
  return data;
}
export const send = (path: string, data: unknown, method = "POST") =>
  request(path, { method, body: JSON.stringify(data) });
