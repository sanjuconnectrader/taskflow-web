import { Capacitor, registerPlugin } from "@capacitor/core";
declare global {
  interface Window {
    taskflow?: {
      platform: string;
      getSession: () => Promise<string | null>;
      setSession: (token: string | null) => Promise<void>;
    };
  }
}
const NativeSession = registerPlugin<{
  get: () => Promise<{ value?: string }>;
  set: (options: { value: string }) => Promise<void>;
  clear: () => Promise<void>;
}>("SecureSession");
export const isNative = () =>
  typeof window !== "undefined" &&
  (Boolean(window.taskflow) || Capacitor.isNativePlatform());
let bearer: string | null = null;
export const currentToken = () => bearer;
export async function loadSession() {
  if (window.taskflow) bearer = await window.taskflow.getSession();
  else if (Capacitor.isNativePlatform())
    bearer = (await NativeSession.get()).value || null;
}
export async function saveSession(value: string | null) {
  bearer = value;
  if (window.taskflow) await window.taskflow.setSession(value);
  else if (Capacitor.isNativePlatform()) {
    if (value) await NativeSession.set({ value });
    else await NativeSession.clear();
  }
}
export async function initializeNative() {
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import("@capacitor/app");
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setOverlaysWebView({ overlay: false });
  App.addListener("backButton", ({ canGoBack }) => {
    if (document.querySelector('[role="dialog"]'))
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    else if (location.hash && location.hash !== "#dashboard") history.back();
    else if (canGoBack) history.back();
    else App.minimizeApp();
  });
  const { Keyboard } = await import("@capacitor/keyboard");
  Keyboard.addListener("keyboardWillShow", () =>
    document.body.classList.add("keyboard-open"),
  );
  Keyboard.addListener("keyboardWillHide", () =>
    document.body.classList.remove("keyboard-open"),
  );
}
