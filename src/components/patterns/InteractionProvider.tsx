"use client";

import { useEffect, type ReactNode } from "react";

/** Shared CSS policy also covers portalled Base UI overlays. No input delay. */
export function InteractionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const keyboard = () => { document.documentElement.dataset.input = "keyboard"; };
    const pointer = () => { document.documentElement.dataset.input = "pointer"; };
    keyboard();
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("pointerdown", pointer, true);
    return () => {
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("pointerdown", pointer, true);
      delete document.documentElement.dataset.input;
    };
  }, []);
  return children;
}
