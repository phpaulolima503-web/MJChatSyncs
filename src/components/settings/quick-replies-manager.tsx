"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { QuickReply } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageSquareDashed, Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "greeting", label: "Greeting" },
  { value: "pricing", label: "Pricing" },
  { value: "website", label: "Website" },
  { value: "seo", label: "SEO" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "support", label: "Support" },
  { value: "follow_up", label: "Follow-up" },
  { value: "closing", label: "Closing" },
];

export function QuickRepliesManager() {
  const supabase = createClient();
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [messageText, setMessageText] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const loadReplies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quick_replies")
      .select("*")
      .order("shortcut");
    if (!error && data) setReplies(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  function handleOpenDialog(reply?: QuickReply) {
    if (reply) {
      setEditingId(reply.id);
      setShortcut(reply.shortcut);
      setMessageText(reply.message_text);
      setCategory(reply.category || "general");
    } else {
      setEditingId(null);
      setShortcut("");
      setMessageText("");
      setCategory("general");
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    let cleanShortcut = shortcut.trim();
    if (!cleanShortcut.startsWith("/")) {
      cleanShortcut = "/" + cleanShortcut;
    }
    if (!cleanShortcut || cleanShortcut === "/" || !messageText.trim()) {
      toast.error("Shortcut and message text are required");
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      shortcut: cleanShortcut,
      message_text: messageText.trim(),
      category: category,
    };

    if (editingId) {
      const { error } = await supabase.from("quick_replies").update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else toast.success("Quick reply updated");
    } else {
      const { error } = await supabase.from("quick_replies").insert(payload);
      if (error) {
        if (error.code === '23505') toast.error("This shortcut already exists");
        else toast.error(error.message);
      } else {
        toast.success("Quick reply created");
      }
    }

    setSaving(false);
    setDialogOpen(false);
    loadReplies();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("quick_replies").delete().eq("id", id);
    if (error) toast.error("Failed to delete quick reply");
    else {
      toast.success("Quick reply deleted");
      loadReplies();
    }
  }

  const filteredReplies = replies.filter((r) => {
    const matchesSearch = 
      r.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.message_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === "all" || r.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card/70 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quick Replies</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create canned responses to reply faster. Type <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-xs">/shortcut</kbd> in the chat input.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Quick Reply
        </Button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex overflow-x-auto gap-1 border-b border-border pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryFilter("all")}
          className={cn(
            "h-8 shrink-0 px-3.5 text-xs font-semibold rounded-lg transition-all",
            selectedCategoryFilter === "all"
              ? "bg-muted text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategoryFilter(cat.value)}
            className={cn(
              "h-8 shrink-0 px-3.5 text-xs font-semibold rounded-lg transition-all",
              selectedCategoryFilter === cat.value
                ? "bg-muted text-foreground shadow-sm ring-1 ring-border"
                : "text-slate-450 hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search shortcuts or messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-card border-border text-foreground"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredReplies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border bg-card/20">
          <MessageSquareDashed className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-foreground">No quick replies found</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first canned response to save time.</p>
          <Button variant="outline" onClick={() => handleOpenDialog()} className="border-border">
            Create Quick Reply
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReplies.map((reply) => (
            <div key={reply.id} className="flex flex-col rounded-xl border border-border bg-card p-5 group hover:border-border transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-mono font-semibold text-primary">
                      {reply.shortcut}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-semibold text-muted-foreground capitalize">
                      {reply.category || "general"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenDialog(reply)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10" onClick={() => handleDelete(reply.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground line-clamp-3">{reply.message_text}</p>
              </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? "Edit Quick Reply" : "New Quick Reply"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Shortcut</Label>
              <Input
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="/hello"
                className="bg-muted border-border text-foreground font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-muted text-foreground text-sm focus:border-primary focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Message Content</Label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Hi there! How can we help you today?"
                className="bg-muted border-border text-foreground min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="bg-card/70 border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
