"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Contact, Tag, ContactTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ContactDetailView } from '@/components/contacts/contact-detail-view';
import { ImportModal } from '@/components/contacts/import-modal';

const PAGE_SIZE = 25;

interface ContactWithTags extends Contact {
  tags?: Tag[];
}

export default function ContactsPage() {
  const supabase = createClient();

  const [contacts, setContacts] = useState<ContactWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editContactTags, setEditContactTags] = useState<ContactTag[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContactId, setDetailContactId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  // All tags for display
  const [tagsMap, setTagsMap] = useState<Record<string, Tag>>({});

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Load agents for bulk assignment
  useEffect(() => {
    async function loadAgents() {
      const { data } = await supabase.from('profiles').select('id, full_name');
      if (data) setAgents(data);
    }
    loadAgents();
  }, [supabase]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening detail sheet
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = contacts.map((c) => c.id);
    const allSelected = currentPageIds.every((id) => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        currentPageIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} contatos?`)) return;

    const { error } = await supabase
      .from('contacts')
      .delete()
      .in('id', selectedIds);

    if (error) {
      toast.error('Falha ao excluir os contatos selecionados');
    } else {
      toast.success(`${selectedIds.length} contatos excluídos`);
      setSelectedIds([]);
      fetchContacts();
    }
  };

  const handleBulkAssignOwner = async (ownerId: string) => {
    if (selectedIds.length === 0 || !ownerId) return;
    const { error } = await supabase
      .from('contacts')
      .update({ owner_id: ownerId })
      .in('id', selectedIds);
      
    if (error) {
      toast.error('Falha ao atribuir responsável');
    } else {
      toast.success(`Responsável atribuído para ${selectedIds.length} contatos`);
      setSelectedIds([]);
      fetchContacts();
    }
  };

  const handleBulkAddTag = async (tagId: string) => {
    if (selectedIds.length === 0 || !tagId) return;
    
    const rows = selectedIds.map(id => ({
      contact_id: id,
      tag_id: tagId
    }));
    
    const { error } = await supabase
      .from('contact_tags')
      .insert(rows);
      
    if (error) {
      toast.error('Falha ao atribuir etiquetas (algumas já podem ter essa etiqueta)');
    } else {
      toast.success(`Etiqueta atribuída a ${selectedIds.length} contatos`);
      setSelectedIds([]);
      fetchContacts();
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedIds.length === 0) return;
    const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));
    
    const headers = ['Nome', 'Telefone', 'Email', 'Empresa', 'Site', 'Setor', 'Origem do Lead', 'Status', 'Criado em'];
    const rows = selectedContacts.map(c => [
      c.name || '',
      c.phone || '',
      c.email || '',
      c.company || '',
      c.website || '',
      c.industry || '',
      c.lead_source || '',
      c.status || '',
      c.created_at || '',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wacrm_contacts_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exportação CSV baixada');
  };

  const handleBulkExportJSON = () => {
    if (selectedIds.length === 0) return;
    const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));
    const jsonContent = JSON.stringify(selectedContacts, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wacrm_contacts_export_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exportação JSON baixada');
  };

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('*');
    if (data) {
      const map: Record<string, Tag> = {};
      data.forEach((t) => (map[t.id] = t));
      setTagsMap(map);
    }
  }, [supabase]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
    }

    const { data, count, error } = await query;

    if (error) {
      toast.error('Falha ao carregar contatos');
      setLoading(false);
      return;
    }

    setTotalCount(count ?? 0);

    if (!data || data.length === 0) {
      setContacts([]);
      setLoading(false);
      return;
    }

    // Fetch tags for these contacts
    const contactIds = data.map((c) => c.id);
    const { data: contactTags } = await supabase
      .from('contact_tags')
      .select('contact_id, tag_id')
      .in('contact_id', contactIds);

    const tagsByContact: Record<string, string[]> = {};
    contactTags?.forEach((ct) => {
      if (!tagsByContact[ct.contact_id]) tagsByContact[ct.contact_id] = [];
      tagsByContact[ct.contact_id].push(ct.tag_id);
    });

    const enriched: ContactWithTags[] = data.map((c) => ({
      ...c,
      tags: (tagsByContact[c.id] ?? [])
        .map((tid) => tagsMap[tid])
        .filter(Boolean),
    }));

    setContacts(enriched);
    setLoading(false);
  }, [supabase, page, search, tagsMap]);

  // Load-once-on-mount-ish data fetches. Each setter inside runs
  // inside an async promise completion (Supabase await), not
  // synchronously in the effect body, so the cascade the lint rule
  // warns about doesn't apply here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContacts();
  }, [fetchContacts]);

  function openAddForm() {
    setEditContact(null);
    setEditContactTags([]);
    setFormOpen(true);
  }

  async function openEditForm(contact: Contact) {
    const { data } = await supabase
      .from('contact_tags')
      .select('*')
      .eq('contact_id', contact.id);
    setEditContact(contact);
    setEditContactTags(data ?? []);
    setFormOpen(true);
  }

  function openDetail(contactId: string) {
    setDetailContactId(contactId);
    setDetailOpen(true);
  }

  function confirmDelete(contact: Contact) {
    setDeleteTarget(contact);
    setDeleteConfirmOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error('Falha ao excluir contato');
    } else {
      toast.success('Contato excluído');
      fetchContacts();
    }

    setDeleting(false);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie sua lista de contatos. {totalCount > 0 && `${totalCount} contatos no total.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-border text-foreground hover:bg-muted"
          >
            <Upload className="size-4" />
            Importar
          </Button>
          <Button
            onClick={openAddForm}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="size-4" />
            Adicionar Contato
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            // Reset pagination when the query changes — the result
            // set shrinks/grows, page N may no longer be valid.
            setPage(0);
          }}
          placeholder="Buscar por nome, telefone ou email..."
          className="pl-8 bg-card border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-12 text-muted-foreground text-center">
                <input
                  type="checkbox"
                  checked={contacts.length > 0 && contacts.every(c => selectedIds.includes(c.id))}
                  onChange={toggleSelectAll}
                  className="rounded bg-background border-border text-primary focus:ring-primary/40 size-3.5 cursor-pointer"
                />
              </TableHead>
              <TableHead className="text-muted-foreground">Nome</TableHead>
              <TableHead className="text-muted-foreground">Telefone</TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">Email</TableHead>
              <TableHead className="text-muted-foreground hidden lg:table-cell">Empresa</TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">Etiquetas</TableHead>
              <TableHead className="text-muted-foreground hidden lg:table-cell">Criado</TableHead>
              <TableHead className="text-muted-foreground w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando contatos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <Users className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {search ? 'Nenhum contato encontrado na busca.' : 'Nenhum contato ainda.'}
                    </p>
                    {!search && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openAddForm}
                        className="mt-2 border-border text-foreground hover:bg-muted"
                      >
                        <Plus className="size-3.5" />
                        Adicionar seu primeiro contato
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className={cn(
                    "border-border hover:bg-card/70 cursor-pointer transition-colors",
                    selectedIds.includes(contact.id) && "bg-card/30 border-l-2 border-primary"
                  )}
                  onClick={() => openDetail(contact.id)}
                >
                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(contact.id)}
                      onChange={e => toggleSelect(contact.id, e as any)}
                      className="rounded bg-slate-955 border-border text-primary focus:ring-primary/40 size-3.5 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="text-foreground font-medium">
                    {contact.name || <span className="text-muted-foreground italic">Sem nome</span>}
                  </TableCell>
                  <TableCell className="text-foreground font-mono text-xs">
                    {contact.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell text-sm">
                    {contact.email || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell text-sm">
                    {contact.company || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                      {contact.tags && contact.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{contact.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                    {new Date(contact.created_at).toLocaleDateString('pt-BR', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-card border-border"
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(contact);
                          }}
                          className="text-foreground focus:bg-muted focus:text-foreground"
                        >
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-muted" />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(contact);
                          }}
                        >
                          <Trash2 className="size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} de{' '}
            {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Contact Form Dialog */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editContact}
        contactTags={editContactTags}
        onSaved={() => {
          fetchContacts();
          fetchTags();
        }}
      />

      {/* Contact Detail Sheet */}
      <ContactDetailView
        open={detailOpen}
        onOpenChange={setDetailOpen}
        contactId={detailContactId}
        onUpdated={fetchContacts}
      />

      {/* Import Modal */}
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchContacts}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Excluir Contato</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir{' '}
              <span className="text-foreground font-medium">
                {deleteTarget?.name || deleteTarget?.phone}
              </span>
              ? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-card border-border">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-border text-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl bg-card border border-primary/35 shadow-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-5 duration-300 text-xs">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs font-black">
              {selectedIds.length} Selecionado{selectedIds.length === 1 ? '' : 's'}
            </Badge>
            <span className="text-[11px] text-muted-foreground font-semibold hidden sm:inline">Ações em Massa</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Owner Assign Select */}
            <select
              onChange={(e) => {
                handleBulkAssignOwner(e.target.value);
                e.target.value = '';
              }}
              className="bg-background border border-border text-foreground rounded px-2.5 py-1 outline-none text-[11px] font-semibold focus:border-primary/50 cursor-pointer"
            >
              <option value="">Atribuir Responsável...</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>

            {/* Tag Assign Select */}
            <select
              onChange={(e) => {
                handleBulkAddTag(e.target.value);
                e.target.value = '';
              }}
              className="bg-slate-955 border border-border text-foreground rounded px-2.5 py-1 outline-none text-[11px] font-semibold focus:border-primary/50 cursor-pointer"
            >
              <option value="">Atribuir Etiqueta...</option>
              {Object.values(tagsMap).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-7 border-border bg-background hover:bg-muted hover:text-foreground text-foreground text-[11px] px-2.5 rounded">
                    Exportar...
                  </Button>
                }
              />
              <DropdownMenuContent className="bg-background border-border text-slate-205">
                <DropdownMenuItem onClick={handleBulkExportCSV} className="focus:bg-muted cursor-pointer">CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkExportJSON} className="focus:bg-muted cursor-pointer">JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk Delete */}
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              size="sm"
              className="h-7 text-[11px] font-bold px-3 rounded"
            >
              Excluir
            </Button>

            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-450 hover:text-foreground text-xs pl-2 border-l border-border cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

