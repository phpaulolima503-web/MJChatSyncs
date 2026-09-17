import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemedToaster } from "@/components/themed-toaster";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_IDS,
  MODE_STORAGE_KEY,
  STORAGE_KEY,
  THEME_IDS,
} from "@/lib/themes";

export const metadata: Metadata = {
  title: {
    default: "MJChatSyncs - WhatsApp CRM & Automation Software",
    template: "%s | MJChatSyncs - WhatsApp CRM",
  },
  description: "MJChatSyncs is a powerful, self-hostable CRM for WhatsApp. Manage your sales pipeline, organize contacts, and automate WhatsApp marketing broadcasts effortlessly.",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/icon" }],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  colorScheme: "light dark",
};

// Inline boot script — runs before React hydrates so the user's
// chosen theme AND light/dark mode are on the <html> element before
// first paint. Without this every page load flashes the default for
// a frame before the React tree mounts and applies the picked values.
//
// Kept dependency-free (no imports, no JSX) — must be a string the
// browser can run as a single <script>. Knowledge of valid theme/mode
// IDs is sourced from the shared constants so adding one doesn't
// silently break the boot path.
const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var STORAGE_KEY = ${JSON.stringify(STORAGE_KEY)};
    var DEFAULT = ${JSON.stringify(DEFAULT_THEME)};
    var ALLOWED = ${JSON.stringify(THEME_IDS)};
    var saved = localStorage.getItem(STORAGE_KEY);
    var theme = ALLOWED.indexOf(saved) !== -1 ? saved : DEFAULT;
    document.documentElement.dataset.theme = theme;

    var MODE_STORAGE_KEY = ${JSON.stringify(MODE_STORAGE_KEY)};
    var DEFAULT_MODE = ${JSON.stringify(DEFAULT_MODE)};
    var ALLOWED_MODES = ${JSON.stringify(MODE_IDS)};
    var savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    var mode = ALLOWED_MODES.indexOf(savedMode) !== -1 ? savedMode : DEFAULT_MODE;
    document.documentElement.dataset.mode = mode;
    // Tailwind's dark: variant needs a literal .dark class (see the
    // @custom-variant line in globals.css) — data-mode alone doesn't
    // activate it.
    document.documentElement.classList.toggle("dark", mode === "dark");
  } catch (_e) {
    document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    document.documentElement.dataset.mode = ${JSON.stringify(DEFAULT_MODE)};
    document.documentElement.classList.toggle("dark", ${JSON.stringify(DEFAULT_MODE)} === "dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-boot"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground font-sans" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
