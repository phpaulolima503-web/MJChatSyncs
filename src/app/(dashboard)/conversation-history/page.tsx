"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, ConversationStatus, Profile } from "@/types";
import { format } from "date-fns";
import { Search, History, User, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Aberta",
  pending: "Pendente",
  closed: "ConcluÃ­da",
};

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  closed: "bg-slate-600/20 text-slate-400 border-slate-600/30",
};

const PAGE_SIZE = 100;

export default function ConversationHistoryPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<string | "all" | "unassigned">("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchPage = useCallback(async (offset: number) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("*, contact:contacts(*)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to load conversation history:", error.message);
      return [] as Conversation[];
    }
    return (data ?? []) as Conversation[];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const [convs, profilesRes] = await Promise.all([
        fetchPage(0),
        supabase.from("profiles").select("*").order("full_name"),
      ]);
      if (cancelled) return;
      setConversations(convs);
      setHasMore(convs.length === PAGE_SIZE);
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    const next = await fetchPage(conversations.length);
    setConversations((prev) => [...prev, ...next]);
    setHasMore(next.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [conversations.length, fetchPage]);

  const agentName = useCallback(
    (userId: string | null | undefined) => {
      if (!userId) return null;
      return profiles.find((p) => p.user_id === userId)?.full_name ?? "Agente desconhecido";
    },
    [profiles],
  );

  const filtered = useMemo(() => {
    let result = conversations;

    if (agentFilter === "unassigned") {
      result = result.filter((c) => !c.assigned_agent_id);
    } else if (agentFilter !== "all") {
      result = result.filter((c) => c.assigned_agent_id === agentFilter);
    }

    if (dateFilter) {
      result = result.filter((c) => {
        if (!c.last_message_at) return false;
        return format(new Date(c.last_message_at), "yyyy-MM-dd") === dateFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q);
      });
    }

    return result;
  }, [conversations, agentFilter, dateFilter, search]);

  const activeAgentLabel =
    agentFilter === "all"
      ? "Todos os Agentes"
      : agentFilter === "unassigned"
        ? "Sem Atendente"
        : agentName(agentFilter) ?? "Agente";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <History className="h-6 w-6 text-primary" />
          HistÃ³rico de Atendimentos
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Todas as conversas com clientes, novas e antigas. Busque por nome
          ou telefone, ou filtre por atendente e data pra ver quem atendeu o quÃª.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="border-slate-700 bg-slate-800 pl-9 text-sm text-white placeholder-slate-500"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-750">
            <User className="h-3.5 w-3.5" />
            {activeAgentLabel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[280px] overflow-y-auto border-slate-700 bg-slate-800">
            <DropdownMenuItem onClick={() => setAgentFilter("all")} className={cn("text-xs", agentFilter === "all" && "text-primary font-bold")}>
              Todos os Agentes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAgentFilter("unassigned")} className={cn("text-xs", agentFilter === "unassigned" && "text-primary font-bold")}>
              Sem Atendente
            </DropdownMenuItem>
            {profiles.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => setAgentFilter(p.user_id)}
                className={cn("text-xs", agentFilter === p.user_id ? "text-primary font-bold" : "text-slate-300")}
              >
                {p.full_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 py-2 pl-8 pr-2 text-xs text-slate-200 [color-scheme:dark]"
          />
        </div>

        {(search || agentFilter !== "all" || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setAgentFilter("all");
              setDateFilter("");
            }}
            className="h-8 gap-1 text-xs text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-slate-500">Nenhuma conversa encontrada com esses filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 font-semibold">Telefone</th>
                  <th className="px-4 py-3 font-semibold">Atendente</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ãšltima mensagem</th>
                  <th className="px-4 py-3 font-semibold">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((conv) => {
                  const name = conv.contact?.name || conv.contact?.phone || "Desconhecido";
                  const agent = agentName(conv.assigned_agent_id);
                  return (
                    <tr
                      key={conv.id}
                      onClick={() => router.push(`/inbox?c=${conv.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-white">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{name}</span>
                          {conv.unread_count > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {conv.contact?.phone ?? "â€”"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {agent ?? <span className="text-slate-600">NÃ£o atribuÃ­do</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            STATUS_COLORS[conv.status],
                          )}
                        >
                          {STATUS_LABELS[conv.status]}
                        </span>
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-3 text-xs text-slate-400">
                        {conv.last_message_text || "Nenhuma mensagem ainda"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {conv.last_message_at
                          ? format(new Date(conv.last_message_at), "dd/MM/yyyy HH:mm")
                          : "â€”"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && hasMore && !search && agentFilter === "all" && !dateFilter && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}
