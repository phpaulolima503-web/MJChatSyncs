"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Zap,
  Workflow,
  Settings,
  LogOut,
  User,
  X,
  HelpCircle,
  BarChart3,
  ListFilter,
  ShoppingCart,
  MessageCircle,
  Bot,
  CreditCard,
  Sparkles,
  Building2,
  Palette,
  Webhook,
  Tag,
  Settings2,
  CheckSquare,
  BookOpen,
  Headphones,
  Globe,
  Receipt,
  FileText,
  Shield,
  AreaChart,
  History,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /**
   * When true, the nav row renders a small "Beta" chip after the label.
   * Purely informational — doesn't affect routing or access.
   */
  beta?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/inbox", label: "Caixa de Entrada", icon: MessageSquare },
  { href: "/conversation-history", label: "Histórico de Atendimentos", icon: History },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/pipelines", label: "Funis", icon: GitBranch },
  { href: "/pipeline-manager", label: "Gerenciador de Funis", icon: Settings2 },
  { href: "/broadcasts", label: "Transmissões", icon: Radio },
  { href: "/automations", label: "Automações", icon: Zap },
  // ── Enterprise Workflow Engine (Part 10) ──────────────────
  { href: "/workflows", label: "Fluxos de Trabalho", icon: Workflow },
  { href: "/workflows/templates", label: "Modelos de Fluxo", icon: Sparkles },
  // ── Analytics & BI (Part 11) ────────────────────────────
  { href: "/analytics/executive", label: "BI Executivo", icon: BarChart3 },
  { href: "/analytics/sales", label: "Análise de Vendas", icon: BarChart3 },
  { href: "/analytics/ai-usage", label: "Uso de IA", icon: Bot },
  { href: "/analytics/reports", label: "Relatórios e Alertas", icon: ListFilter },
  // ── GST & Billing (Part 12) ─────────────────────────────
  { href: "/billing", label: "Faturamento GST", icon: Receipt },
  { href: "/billing/new", label: "Nova Fatura", icon: FileText },
  { href: "/gst-reports", label: "Declarações GST", icon: BarChart3 },
  { href: "/payment-history", label: "Histórico de Pagamentos", icon: CreditCard },
  // ── Knowledge Base (Part 13) ─────────────────────────────
  { href: "/knowledge", label: "Base de Conhecimento", icon: BookOpen },
  // ── Customer Support (Part 14) ──────────────────────────
  { href: "/support", label: "Chamados de Suporte", icon: Headphones },
  { href: "/support/settings", label: "Configurações de Suporte", icon: Settings2 },
  // ── SEO Module (Part 15) ────────────────────────────────
  { href: "/seo", label: "SEO e Marketing", icon: Globe },
  // ── SaaS Admin (Part 16) ────────────────────────────────
  { href: "/admin", label: "Painel Admin", icon: Shield },
  // ── Existing ────────────────────────────────────────────
  { href: "/flows", label: "Fluxos", icon: Workflow, beta: true },
  { href: "/templates", label: "Modelos", icon: MessageSquare },
  { href: "/quick-replies", label: "Respostas Rápidas", icon: MessageSquare },
  { href: "/tags", label: "Etiquetas", icon: Tag },
  { href: "/segments", label: "Segmentos", icon: ListFilter },
  { href: "/commerce", label: "Comércio", icon: ShoppingCart },
  { href: "/integrations", label: "Integrações", icon: Webhook },
  { href: "/widgets", label: "Widget de Chat", icon: MessageCircle },
  { href: "/ai-router", label: "Roteador de IA", icon: Bot },
  { href: "/analytics", label: "Análises (Legado)", icon: BarChart3 },
  { href: "/team", label: "Equipe", icon: Users },
  { href: "/workspace", label: "Workspace e Marca", icon: Building2 },
  { href: "/appearance", label: "Aparência", icon: Palette },
];

const bottomNavItems = [
  { href: "/docs", label: "Ajuda e Documentação", icon: HelpCircle },
  { href: "/settings", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const totalUnread = useTotalUnread();

  // Close the drawer when route changes — users opened it to navigate,
  // so once they pick a destination the drawer should get out of the way.
  useEffect(() => {
    onClose?.();
    // Only pathname drives this — onClose identity doesn't need to re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll and allow Escape to close while the drawer is open on
  // mobile. No-ops on desktop because the sidebar isn't positioned there.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — only exists on mobile and only when open. Clicking
          it closes the drawer. Hidden from lg+ since the sidebar is
          part of the main flex row there. */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          // Always an overlay drawer now — the top nav in <Header> covers
          // the common paths on desktop, this is the "everything" menu,
          // opened by the hamburger button on any screen size.
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Menu completo"
      >
        {/* Logo row + close button — always shown since this is always an
            overlay now, never a static always-visible rail. */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              CRM para WhatsApp
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              const showUnreadDot =
                item.href === "/inbox" && totalUnread > 0 && !isActive;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      // Taller on mobile so fingers can hit the row reliably (≥44px).
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.beta && (
                      <span
                        aria-label="Recurso beta"
                        className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
                      >
                        Beta
                      </span>
                    )}
                    {showUnreadDot && (
                      <span
                        aria-label={`${totalUnread} conversa${totalUnread === 1 ? "" : "s"} não lida${totalUnread === 1 ? "" : "s"}`}
                        className="relative flex h-2 w-2"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-border" />

          <ul className="flex flex-col gap-1">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none data-popup-open:bg-muted/60">
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.full_name ?? "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.email ?? ""}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-card text-foreground ring-border"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-foreground focus:bg-muted focus:text-foreground"
                  />
                }
              >
                <User className="size-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-foreground focus:bg-muted focus:text-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-muted" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-foreground focus:bg-muted focus:text-foreground"
              >
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
