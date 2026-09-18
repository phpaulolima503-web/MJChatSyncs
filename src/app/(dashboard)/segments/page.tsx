"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ContactSegment } from "@/types";
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
import { ListFilter, Plus, Search, Trash2, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SegmentsPage() {
  const supabase = createClient();
  const [segments, setSegments] = useState<ContactSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_segments")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setSegments(data);
    setLoading(false);
  }

  function handleOpenDialog() {
    setName("");
    setDescription("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Segment name is required");
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      setSaving(false);
      return;
    }

    // Default empty filter criteria for now
    const payload = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim(),
      filter_criteria: { rules: [] },
    };

    const { error } = await supabase.from("contact_segments").insert(payload);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Segment created successfully");
    }

    setSaving(false);
    setDialogOpen(false);
    loadSegments();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("contact_segments").delete().eq("id", id);
    if (error) toast.error("Failed to delete segment");
    else {
      toast.success("Segment deleted");
      loadSegments();
    }
  }

  const filteredSegments = segments.filter((s) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contact Segments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Group your contacts based on tags, custom fields, and behaviors to send targeted broadcasts.
          </p>
        </div>
        <Button
          onClick={handleOpenDialog}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search segments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-card border-border text-foreground max-w-md"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-card border border-border" />
          ))}
        </div>
      ) : filteredSegments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border bg-card/30">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <ListFilter className="h-10 w-10 text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">No segments found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6 text-center max-w-sm">
            Create your first segment to organize your contacts into dynamic smart lists.
          </p>
          <Button onClick={handleOpenDialog} className="shadow-lg shadow-primary/20">
            Create your first segment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSegments.map((segment) => (
            <div key={segment.id} className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-border transition-colors">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="h-4 w-4 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-foreground">{segment.name}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(segment.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {segment.description || "No description provided for this segment."}
                </p>
              </div>
              <div className="border-t border-border p-3 bg-background/50 flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-md">Dynamic List</span>
                <Link href="/contacts" className="text-xs font-medium text-primary hover:text-primary/80 flex items-center">
                  View Contacts <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Segment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Segment Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., VIP Customers"
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Description (Optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Customers who spent over $500"
                className="bg-muted border-border text-foreground resize-none"
              />
            </div>
            {/* Future iteration: Build dynamic query builder here */}
            <div className="p-3 bg-accent/60 rounded-lg border border-border text-xs text-muted-foreground">
              <span className="text-primary font-medium">Coming Soon:</span> Visual Filter Builder will be added here to let you define rules like "Tag is VIP" or "Deal value &gt; 1000". For now, this creates an empty placeholder segment.
            </div>
          </div>
          <DialogFooter className="bg-card/70 border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Saving..." : "Create Segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
