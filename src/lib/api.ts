import { currentToken, saveSession } from "./platform";
const configuredAPI =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
let override: string | null = null;
if (typeof window !== "undefined") {
  try {
    override = localStorage.getItem("taskflow-api-origin");
  } catch {}
}
export const API = override || configuredAPI;
export async function configureAPI(value: string) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Enter only the API origin, without credentials or a path.",
    );
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error(
      "Use HTTPS. HTTP is only supported for localhost development.",
    );
  await saveSession(null);
  localStorage.setItem("taskflow-api-origin", url.origin);
  location.reload();
}
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
  return result.json();
}
export const send = (path: string, data: unknown, method = "POST") =>
  request(path, { method, body: JSON.stringify(data) });
