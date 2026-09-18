"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import {
  LogOut, Menu, Settings as SettingsIcon, User, Building2, ChevronDown,
  Sparkles, Plus, Check, Search, Bell, MessageSquare, LayoutGrid, BarChart3,
  Users, GitBranch, Settings2, Tag, ListFilter, History, CheckSquare, Zap,
  Workflow, Radio, Bot, BookOpen, ShoppingCart, MessageCircle, Webhook,
  Receipt, FileText, CreditCard, Globe, Palette, HelpCircle, Headphones,
  Shield,
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
import { Button } from "@/components/ui/button";

import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GlobalSearchModal } from "./global-search-modal";
import { cn } from "@/lib/utils";

// Top nav groups — Papervines-style: a few primary tabs, the long tail of
// features tucked into dropdowns instead of a full-height side list.
// Every href here also exists in Sidebar's navItems; that list stays as
// the mobile drawer / full menu, this is just a second, grouped way in.
interface TopNavLeaf {
  href: string;
  label: string;
  icon: typeof MessageSquare;
}
interface TopNavGroup {
  key: string;
  label: string;
  icon: typeof MessageSquare;
  /** Single link (Atendimentos) vs a dropdown of sub-items. */
  href?: string;
  items?: TopNavLeaf[];
}

const TOP_NAV_GROUPS: TopNavGroup[] = [
  { key: "inbox", label: "Atendimentos", icon: MessageSquare, href: "/inbox" },
  {
    key: "crm",
    label: "CRM",
    icon: Users,
    items: [
      { href: "/contacts", label: "Contatos", icon: Users },
      { href: "/pipelines", label: "Funis", icon: GitBranch },
      { href: "/pipeline-manager", label: "Gerenciador de Funis", icon: Settings2 },
      { href: "/conversation-history", label: "Histórico de Atendimentos", icon: History },
      { href: "/tasks", label: "Tarefas", icon: CheckSquare },
      { href: "/tags", label: "Etiquetas", icon: Tag },
      { href: "/segments", label: "Segmentos", icon: ListFilter },
      { href: "/team", label: "Equipe", icon: Users },
    ],
  },
  {
    key: "apps",
    label: "Apps",
    icon: LayoutGrid,
    items: [
      { href: "/automations", label: "Automações", icon: Zap },
      { href: "/workflows", label: "Fluxos de Trabalho", icon: Workflow },
      { href: "/workflows/templates", label: "Modelos de Fluxo", icon: Sparkles },
      { href: "/flows", label: "Fluxos", icon: Workflow },
      { href: "/broadcasts", label: "Transmissões", icon: Radio },
      { href: "/templates", label: "Modelos de Mensagem", icon: MessageSquare },
      { href: "/quick-replies", label: "Respostas Rápidas", icon: MessageSquare },
      { href: "/ai-router", label: "Roteador de IA", icon: Bot },
      { href: "/knowledge", label: "Base de Conhecimento", icon: BookOpen },
      { href: "/commerce", label: "Comércio", icon: ShoppingCart },
      { href: "/widgets", label: "Widget de Chat", icon: MessageCircle },
      { href: "/integrations", label: "Integrações", icon: Webhook },
    ],
  },
  {
    key: "reports",
    label: "Relatórios",
    icon: BarChart3,
    items: [
      { href: "/analytics/executive", label: "BI Executivo", icon: BarChart3 },
      { href: "/analytics/sales", label: "Análise de Vendas", icon: BarChart3 },
      { href: "/analytics/ai-usage", label: "Uso de IA", icon: Bot },
      { href: "/analytics/reports", label: "Relatórios e Alertas", icon: ListFilter },
      { href: "/analytics", label: "Análises (Legado)", icon: BarChart3 },
      { href: "/billing", label: "Faturamento GST", icon: Receipt },
      { href: "/billing/new", label: "Nova Fatura", icon: FileText },
      { href: "/gst-reports", label: "Declarações GST", icon: BarChart3 },
      { href: "/payment-history", label: "Histórico de Pagamentos", icon: CreditCard },
      { href: "/seo", label: "SEO e Marketing", icon: Globe },
    ],
  },
  {
    key: "settings",
    label: "Ajustes",
    icon: SettingsIcon,
    items: [
      { href: "/settings", label: "Configurações", icon: SettingsIcon },
      { href: "/workspace", label: "Workspace e Marca", icon: Building2 },
      { href: "/appearance", label: "Aparência", icon: Palette },
      { href: "/support", label: "Chamados de Suporte", icon: Headphones },
      { href: "/support/settings", label: "Configurações de Suporte", icon: Settings2 },
      { href: "/admin", label: "Painel Admin", icon: Shield },
      { href: "/docs", label: "Ajuda e Documentação", icon: HelpCircle },
    ],
  },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Painel",
  "/inbox": "Caixa de Entrada",
  "/conversation-history": "Histórico de Atendimentos",
  "/contacts": "Contatos",
  "/pipelines": "Funis",
  "/pipeline-manager": "Gerenciador de Funis",
  "/broadcasts": "Transmissões",
  "/automations": "Automações",
  "/settings": "Configurações",
  "/workspace": "Workspace e Marca",
  "/team": "Equipe",
  "/appearance": "Aparência",
  "/templates": "Modelos",
  "/tags": "Etiquetas",
  "/flows": "Fluxos",
  "/quick-replies": "Respostas Rápidas",
  "/segments": "Segmentos",
  "/commerce": "Comércio",
  "/integrations": "Integrações",
  "/widgets": "Widget de Chat",
  "/ai-router": "Roteador de IA",
  "/analytics": "Análises",
  "/support": "Ajuda e Suporte",
  "/admin": "Painel Admin",
  "/ai-conversations": "Conversas de IA",
  "/ai-knowledge": "Conhecimento de IA",
  "/developers": "Configurações de Desenvolvedor",
  "/docs": "Documentação",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "Dashboard";
}

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const title = getPageTitle(pathname);
  const supabase = createClient();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Load live notifications
  useEffect(() => {
    if (!user) return;

    async function loadNotifications() {
      try {
        const list: any[] = [];
        
        // 1. Overdue/pending tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'pending')
          .limit(3);

        if (tasksData) {
          tasksData.forEach(t => {
            list.push({
              id: t.id,
              title: `Tarefa do CRM: ${t.title}`,
              body: t.description || 'Ação pendente.',
              time: t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : 'Sem data de vencimento',
            });
          });
        }

        // 2. Upcoming meetings
        const { data: meetingsData } = await supabase
          .from('meeting_bookings')
          .select('*')
          .eq('status', 'scheduled')
          .limit(3);

        if (meetingsData) {
          meetingsData.forEach(m => {
            list.push({
              id: m.id,
              title: `Reunião: ${m.title || 'Chamada com Cliente'}`,
              body: `Discussão agendada.`,
              time: new Date(m.start_time).toLocaleDateString('pt-BR'),
            });
          });
        }

        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }

    loadNotifications();
  }, [user, supabase]);

  const updateAvailability = async (status: 'online' | 'busy' | 'away') => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ availability: status, last_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      toast.error('Falha ao atualizar status de disponibilidade');
    } else {
      const labels: Record<typeof status, string> = { online: 'ONLINE', busy: 'OCUPADO', away: 'AUSENTE' };
      toast.success(`Status definido como ${labels[status]}`);
      router.refresh();
    }
  };

  useEffect(() => {
    if (!user) return;
    loadWorkspaces();
  }, [user, profile]);

  async function loadWorkspaces() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("business_workspaces")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Auto-provision default business workspace for user
        const defaultName = `${profile?.full_name || "My"} Business`;
        const { data: newWs, error: insertErr } = await supabase
          .from("business_workspaces")
          .insert({
            user_id: user.id,
            name: defaultName,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        if (newWs) {
          setWorkspaces([newWs]);
          setActiveWorkspace(newWs);
          localStorage.setItem("wacrm_active_workspace_id", newWs.id);
        }
      } else {
        setWorkspaces(data);
        const cachedId = localStorage.getItem("wacrm_active_workspace_id");
        const cachedWs = data.find((ws) => ws.id === cachedId);
        if (cachedWs) {
          setActiveWorkspace(cachedWs);
        } else {
          setActiveWorkspace(data[0]);
          localStorage.setItem("wacrm_active_workspace_id", data[0].id);
        }
      }
    } catch (err: any) {
      console.error("[header] Failed to load workspaces:", err.message);
    }
  }

  const handleSwitchWorkspace = (ws: any) => {
    setActiveWorkspace(ws);
    localStorage.setItem("wacrm_active_workspace_id", ws.id);
    window.dispatchEvent(new Event("wacrm_workspace_changed"));
    toast.success(`Alternado para workspace: ${ws.name}`);
  };

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  const handleAddWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkspaceName.trim() && user) {
      try {
        const { data, error } = await supabase
          .from("business_workspaces")
          .insert({
            user_id: user.id,
            name: newWorkspaceName.trim(),
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setWorkspaces((prev) =>
            [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setActiveWorkspace(data);
          localStorage.setItem("wacrm_active_workspace_id", data.id);
          window.dispatchEvent(new Event("wacrm_workspace_changed"));
          toast.success(`Workspace "${data.name}" criado!`);
        }
      } catch (err: any) {
        toast.error("Falha ao criar workspace: " + err.message);
      } finally {
        setNewWorkspaceName("");
        setIsAddingWorkspace(false);
      }
    }
  };

  const totalUnread = useTotalUnread();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 lg:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {/* Hamburger — opens the full menu (every nav item). Visible on
            all sizes: on mobile it's the only way in, on desktop it's
            the "everything else" fallback next to the grouped tabs. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Abrir menu completo"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand */}
        <Link href="/dashboard" className="mr-1 hidden shrink-0 items-center gap-2 pl-1 pr-2 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-bold text-foreground">CRM</span>
        </Link>

        {/* Grouped top nav — Papervines-style tabs. Overflow-x scrolls on
            narrow desktop widths rather than wrapping, so the row never
            grows past one line. */}
        <nav
          aria-label="Navegação principal"
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none"
        >
          {TOP_NAV_GROUPS.map((group) => {
            const isSingleLink = !!group.href;
            const isActive = isSingleLink
              ? pathname === group.href || pathname.startsWith(group.href!)
              : (group.items ?? []).some(
                  (it) => pathname === it.href || pathname.startsWith(it.href),
                );
            const showUnreadDot = group.key === "inbox" && totalUnread > 0 && !isActive;

            if (isSingleLink) {
              return (
                <Link
                  key={group.key}
                  href={group.href!}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <group.icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{group.label}</span>
                  {showUnreadDot && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                  )}
                </Link>
              );
            }

            return (
              <DropdownMenu key={group.key}>
                <DropdownMenuTrigger
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors focus:outline-none",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <group.icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{group.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-card border-border text-foreground">
                  {(group.items ?? []).map((item) => {
                    const itemActive = pathname === item.href || pathname.startsWith(item.href);
                    return (
                      <DropdownMenuItem
                        key={item.href}
                        render={
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2",
                              itemActive
                                ? "text-primary"
                                : "text-foreground focus:bg-muted focus:text-foreground",
                            )}
                          />
                        }
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>
      </div>

      <div className="hidden min-w-0 shrink-0 items-center lg:flex">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              {activeWorkspace?.name || "Selecionar Workspace..."}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-card border-border text-foreground">
            <>
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Espaços de Trabalho
                </div>
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws)}
                    className="flex items-center justify-between cursor-pointer focus:bg-muted focus:text-foreground"
                  >
                    <span className="truncate">{ws.name}</span>
                    {activeWorkspace?.id === ws.id && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-muted" />
                {isAddingWorkspace ? (
                  <form onSubmit={handleAddWorkspace} className="p-2 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Nome do workspace..."
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      className="flex h-7 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-7 px-2 bg-primary text-foreground text-xs">
                      Adicionar
                    </Button>
                  </form>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setIsAddingWorkspace(true)}
                    className="flex items-center gap-1.5 text-xs text-primary focus:bg-muted focus:text-primary cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Workspace
                  </DropdownMenuItem>
                )}
            </>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        {/* Spotlight Search Trigger */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden md:flex items-center gap-2.5 w-60 rounded-xl border border-border bg-muted/50 hover:bg-card/70 px-3 py-1.5 text-xs text-slate-450 hover:text-foreground transition-all focus:outline-none cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 text-left">Buscar qualquer coisa...</span>
          <kbd className="flex h-4 items-center gap-0.5 rounded bg-card px-1 text-[8px] font-bold text-muted-foreground border border-border font-mono">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>

        {/* Mobile Search Icon Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="relative h-8 w-8 flex items-center justify-center rounded-xl border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-550 text-[8px] font-bold text-foreground animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-72 bg-slate-905 border-border text-slate-250 p-2 space-y-2">
            <div className="flex items-center justify-between px-2 py-1 border-b border-border">
              <span className="text-[10px] font-extrabold text-foreground uppercase tracking-wider">Alertas e Ações</span>
              {notifications.length > 0 && (
                <button
                  onClick={() => setNotifications([])}
                  className="text-[9px] text-primary hover:text-primary/80 font-bold uppercase"
                >
                  Limpar
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-5 text-slate-550 text-[11px]">
                Nenhuma notificação nova. Tudo em dia!
              </div>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {notifications.map(n => (
                  <div key={n.id} className="bg-background/60 p-2 rounded-lg border border-border text-[11px] space-y-0.5">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-foreground leading-snug">{n.title}</span>
                      <span className="text-[8px] text-muted-foreground font-mono shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-450 leading-normal">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Account Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-accent focus:bg-accent focus:outline-none data-popup-open:bg-accent sm:gap-3 sm:pl-1 sm:pr-3"
            aria-label="Abrir menu da conta"
          >
            <div className="relative">
              <Avatar className="size-8">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                "absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-card",
                profile?.availability === 'online' ? 'bg-emerald-555' :
                profile?.availability === 'busy' ? 'bg-rose-555' :
                profile?.availability === 'away' ? 'bg-amber-555' :
                'bg-slate-500'
              )} />
            </div>
            <span className="hidden text-sm font-medium text-foreground sm:inline">
              {profile?.full_name ?? "Usuário"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-56 bg-card text-foreground ring-border"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.full_name ?? "Usuário"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email ?? ""}
              </p>
            </div>

            <div className="px-2 py-1.5 border-t border-b border-border my-1 bg-muted/40">
              <span className="text-[9px] text-muted-foreground uppercase font-extrabold block mb-1 tracking-wider">Definir Disponibilidade</span>
              <div className="flex items-center gap-1">
                {([
                  { key: 'online', label: 'Online', color: 'bg-emerald-500' },
                  { key: 'busy', label: 'Ocupado', color: 'bg-rose-500' },
                  { key: 'away', label: 'Ausente', color: 'bg-amber-500' },
                ] as const).map(status => (
                  <button
                    key={status.key}
                    type="button"
                    onClick={() => updateAvailability(status.key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded border transition-all font-semibold cursor-pointer",
                      profile?.availability === status.key
                        ? "bg-muted text-foreground border-border"
                        : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/45 hover:text-foreground"
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full shrink-0", status.color)} />
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=profile"
                  className="flex items-center gap-2 text-foreground focus:bg-muted focus:text-foreground"
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
                  className="flex items-center gap-2 text-foreground focus:bg-muted focus:text-foreground"
                />
              }
            >
              <SettingsIcon className="size-4" />
              Configurações
            </DropdownMenuItem>
            {profile?.role === "admin" && (
              <DropdownMenuItem
                render={
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 text-foreground focus:bg-muted focus:text-foreground font-semibold text-amber-300"
                  />
                }
              >
                <Building2 className="size-4 text-amber-300" />
                Painel Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuItem
              onClick={signOut}
              className="text-foreground focus:bg-muted focus:text-foreground cursor-pointer"
            >
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <GlobalSearchModal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>
  );
}

