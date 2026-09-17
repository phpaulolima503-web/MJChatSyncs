"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/hooks/use-theme";

/**
 * Wraps sonner's <Toaster> so its color scheme follows our own
 * light/dark mode instead of the OS `prefers-color-scheme` sonner
 * defaults to — those can disagree (e.g. OS is dark, user picked
 * light mode here), which used to leave toasts unreadable against
 * whichever mode won.
 */
export function ThemedToaster() {
  const { mode } = useTheme();
  return (
    <Toaster
      theme={mode}
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--popover)",
          border: "1px solid var(--border)",
          color: "var(--popover-foreground)",
        },
      }}
    />
  );
}
