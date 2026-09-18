"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { Conversation, MessageTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { TemplatePicker } from "./template-picker";

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired once the conversation exists and the opening template has been sent. */
  onCreated: (conversation: Conversation) => void;
}

// Same placeholder-fill logic as template-picker.tsx / message-thread.tsx —
// small enough that sharing it isn't worth a shared-module indirection.
function renderTemplateBody(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, raw) => {
    const idx = Number(raw) - 1;
    const value = params[idx];
    return value && value.trim().length > 0 ? value : `{{${raw}}}`;
  });
}

/**
 * Meta requires every WhatsApp conversation with a contact who hasn't
 * messaged you in the last 24h to be opened with a pre-approved template —
 * free-form text is rejected outside that window. This modal is the only
 * path the UI offers to start a brand-new thread, so it always routes
 * through TemplatePicker (which only lists Approved templates) instead of
 * a free-text box.
 */
export function NewConversationModal({
  open,
  onOpenChange,
  onCreated,
}: NewConversationModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"contact" | "template">("contact");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep("contact");
    setPhone("");
    setName("");
    setSubmitting(false);
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const normalizedPhone = phone.trim().replace(/[^\d+]/g, "");
  const canProceed = normalizedPhone.replace(/\D/g, "").length >= 8;

  async function handleTemplateSelected(
    template: MessageTemplate,
    params: string[],
  ) {
    if (!user) return;
    setSubmitting(true);
    try {
      const supabase = createClient();

      // Find-or-create the contact by phone. Reusing an existing contact
      // (and its conversation, below) is deliberate — "new conversation"
      // with someone you already have a closed/stale thread with should
      // reopen it, not fork a duplicate.
      const { data: existingContact, error: contactLookupErr } =
        await supabase
          .from("contacts")
          .select("*")
          .eq("user_id", user.id)
          .eq("phone", normalizedPhone)
          .maybeSingle();
      if (contactLookupErr) throw contactLookupErr;

      let contact = existingContact;
      if (!contact) {
        const { data: createdContact, error: contactInsertErr } =
          await supabase
            .from("contacts")
            .insert({
              user_id: user.id,
              phone: normalizedPhone,
              name: name.trim() || normalizedPhone,
            })
            .select()
            .single();
        if (contactInsertErr) throw contactInsertErr;
        contact = createdContact;
      }

      const { data: existingConv, error: convLookupErr } = await supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .eq("user_id", user.id)
        .eq("contact_id", contact.id)
        .maybeSingle();
      if (convLookupErr) throw convLookupErr;

      let conversation = existingConv;
      if (!conversation) {
        const { data: createdConv, error: convInsertErr } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            contact_id: contact.id,
            status: "open",
            channel: "whatsapp",
          })
          .select("*, contact:contacts(*)")
          .single();
        if (convInsertErr) throw convInsertErr;
        conversation = createdConv;
      }

      const renderedBody = renderTemplateBody(template.body_text, params);

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversation.id,
          message_type: "template",
          template_name: template.name,
          template_params: params,
          template_language: template.language,
          content_text: renderedBody,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `HTTP ${res.status}`);
      }

      toast.success(`Conversa iniciada com ${contact.name || contact.phone}`);
      onCreated(conversation as Conversation);
      handleClose(false);
    } catch (err) {
      console.error("Failed to start conversation:", err);
      const reason = err instanceof Error ? err.message : "erro desconhecido";
      toast.error(`Falha ao iniciar conversa: ${reason}`);
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open && step === "contact"} onOpenChange={handleClose}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              Nova Conversa
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              A Meta exige um modelo aprovado para iniciar uma conversa com
              um contato novo. No próximo passo você escolhe o modelo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Número de telefone</Label>
              <Input
                placeholder="+55 11 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Inclua o código do país (ex: 55 para Brasil).
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Nome do contato (opcional)</Label>
              <Input
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-border text-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              disabled={!canProceed}
              onClick={() => setStep("template")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Avançar: Escolher Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplatePicker
        open={open && step === "template" && !submitting}
        onOpenChange={(next) => {
          if (!next) setStep("contact");
        }}
        onSelect={handleTemplateSelected}
      />

      {submitting && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent className="border-border bg-card sm:max-w-xs">
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-foreground">Enviando modelo e criando a conversa...</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
