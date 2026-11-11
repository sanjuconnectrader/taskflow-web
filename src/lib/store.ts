import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useUI = create(
  persist<{
    collapsed: boolean;
    workspaceId: string;
    setCollapsed: (v: boolean) => void;
    setWorkspace: (v: string) => void;
  }>(
    (set) => ({
      collapsed: false,
      workspaceId: "",
      setCollapsed: (collapsed) => set({ collapsed }),
      setWorkspace: (workspaceId) => set({ workspaceId }),
    }),
    { name: "taskflow-ui" },
  ),
);
