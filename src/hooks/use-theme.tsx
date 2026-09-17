"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  STORAGE_KEY,
  isModeId,
  isThemeId,
  type ModeId,
  type ThemeId,
} from "@/lib/themes";

/**
 * ThemeProvider — wraps the whole app, owns the active theme + mode state.
 *
 * The boot script in `src/app/layout.tsx` has already applied both
 * `document.documentElement.dataset.theme` (accent color) and
 * `document.documentElement.dataset.mode` (light/dark) before React
 * hydrates, so by the time this Provider mounts the page is already
 * painted in the right colors. We just have to read what's there and
 * keep it in sync going forward.
 *
 * Theme (accent color) and mode (light/dark) are independent axes —
 * switching one never resets the other. Persistence is localStorage
 * only (device-scoped). A future follow-up could mirror to
 * `profiles.preferences` for cross-device sync, but a per-device
 * choice is also defensible — your phone may deserve a different
 * combination than your laptop.
 */

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (next: ThemeId) => void;
  mode: ModeId;
  setMode: (next: ModeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  // Whatever the boot script applied is the truth. Fall back to
  // localStorage / default if for some reason the attribute is missing
  // (e.g. someone bypassed the boot script in a custom layout).
  const fromAttr = document.documentElement.dataset.theme;
  if (isThemeId(fromAttr)) return fromAttr;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    // localStorage can throw in private-browsing / sandboxed contexts.
  }
  return DEFAULT_THEME;
}

function readInitialMode(): ModeId {
  if (typeof window === "undefined") return DEFAULT_MODE;
  const fromAttr = document.documentElement.dataset.mode;
  if (isModeId(fromAttr)) return fromAttr;
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (isModeId(stored)) return stored;
  } catch {
    // Same private-browsing edge case as above.
  }
  return DEFAULT_MODE;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme);
  const [mode, setModeState] = useState<ModeId>(readInitialMode);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = next;
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Same private-browsing edge case as above; the in-memory state
      // still updates so the current tab works for the session.
    }
  }, []);

  const setMode = useCallback((next: ModeId) => {
    setModeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.mode = next;
      // Tailwind's `dark:` variant is wired to a `.dark` class ancestor
      // (see the `@custom-variant dark` line in globals.css), not to
      // data-mode directly — toggle it here too so `dark:` utilities
      // anywhere in the app respond to the same switch.
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Same private-browsing edge case as above.
    }
  }, []);

  // Defensive re-sync on mount: the boot script in layout.tsx already
  // applies the `dark` class before hydration, but this covers any
  // path that renders <ThemeProvider> without that script having run
  // (e.g. a future embed/preview context).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    // Only on mount — setMode already keeps this in sync afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync from other tabs — if you change your theme/mode in tab A, tab
  // B catches up without a refresh.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        if (isThemeId(e.newValue) && e.newValue !== theme) {
          setThemeState(e.newValue);
          document.documentElement.dataset.theme = e.newValue;
        }
      } else if (e.key === MODE_STORAGE_KEY) {
        if (isModeId(e.newValue) && e.newValue !== mode) {
          setModeState(e.newValue);
          document.documentElement.dataset.mode = e.newValue;
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [theme, mode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider — return
    // no-op setters so callers don't crash. The boot script still
    // applied the right CSS attributes, so visually the page is fine.
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      mode: DEFAULT_MODE,
      setMode: () => {},
    };
  }
  return ctx;
}
