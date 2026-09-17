"use client";

import { Check, Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { MODE_IDS, THEMES, type ModeId, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

/**
 * Appearance panel — light/dark mode + color-theme picker.
 *
 * Click a card/option → applies + persists immediately. No save
 * button: each change is a CSS-variable swap on <html>, there's
 * nothing to roll back. The active pick carries a check chip + a
 * primary-tinted border so it's obvious at a glance.
 *
 * Persistence: localStorage only (device-scoped). The boot script in
 * layout.tsx replays both choices before first paint on subsequent
 * loads.
 */
export function AppearancePanel() {
  const { theme, setTheme, mode, setMode } = useTheme();
  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mode</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Light or dark background. Saved to this device.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
          {MODE_IDS.map((m) => (
            <ModeCard
              key={m}
              id={m}
              isActive={m === mode}
              onPick={() => setMode(m)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Color theme
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the accent color used across the app — buttons, active
            nav, badges. Works with either mode above. Saved to this
            device.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              id={t.id}
              name={t.name}
              tagline={t.tagline}
              swatch={t.swatch}
              isActive={t.id === theme}
              onPick={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const MODE_META: Record<ModeId, { label: string; Icon: typeof Sun }> = {
  light: { label: "Light", Icon: Sun },
  dark: { label: "Dark", Icon: Moon },
};

function ModeCard({
  id,
  isActive,
  onPick,
}: {
  id: ModeId;
  isActive: boolean;
  onPick: () => void;
}) {
  const { label, Icon } = MODE_META[id];
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isActive}
      aria-label={`Use ${label} mode`}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left transition-colors",
        isActive
          ? "border-primary/60 ring-2 ring-primary/40"
          : "border-border hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4 text-foreground" />
      <span className="flex-1 text-sm font-medium text-foreground">
        {label}
      </span>
      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

function ThemeCard({
  id,
  name,
  tagline,
  swatch,
  isActive,
  onPick,
}: {
  id: ThemeId;
  name: string;
  tagline: string;
  swatch: string;
  isActive: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isActive}
      aria-label={`Use ${name} theme`}
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors",
        isActive
          ? "border-primary/60 ring-2 ring-primary/40"
          : "border-border hover:bg-accent",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-full"
          style={{
            background: swatch,
            boxShadow: "inset 0 0 0 1px oklch(0.5 0 0 / 0.2)",
          }}
        />
        {isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Check className="h-3 w-3" />
            Active
          </span>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {tagline}
        </div>
      </div>
      <div
        className="mt-1 flex h-2 overflow-hidden rounded-full"
        aria-hidden
      >
        <span className="flex-1" style={{ background: swatch }} />
        <span className="w-3 bg-muted-foreground/40" />
        <span className="w-3 bg-muted-foreground/60" />
        <span className="w-3 bg-muted-foreground/80" />
      </div>
      <span className="sr-only">Theme id: {id}</span>
    </button>
  );
}
