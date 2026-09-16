import { SupabaseClient } from '@supabase/supabase-js';

export class SyncRepository {
  private client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }

  async syncLead(organizationId: string, lead: { phone: string; name: string }) {
    const { data: existing, error: selectError } = await this.client
      .from('contacts')
      .select()
      .eq('user_id', organizationId)
      .eq('phone', lead.phone)
      .maybeSingle();

    if (selectError) {
      throw new Error(`syncLead select failed: ${selectError.message}`);
    }

    if (existing) {
      const { data, error } = await this.client
        .from('contacts')
        .update({ name: lead.name })
        .eq('id', existing.id)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`syncLead update failed: ${error?.message ?? 'no data returned'}`);
      }
      return { contact: data, wasCreated: false };
    }

    const { data, error } = await this.client
      .from('contacts')
      .insert({ user_id: organizationId, phone: lead.phone, name: lead.name })
      .select()
      .single();

    if (error) {
      // Race: another concurrent webhook call created the same contact
      // between our select and this insert. Fall back to fetching it.
      const { data: raced } = await this.client
        .from('contacts')
        .select()
        .eq('user_id', organizationId)
        .eq('phone', lead.phone)
        .maybeSingle();
      if (raced) return { contact: raced, wasCreated: false };
      throw new Error(`syncLead insert failed: ${error.message}`);
    }
    if (!data) {
      throw new Error('syncLead insert failed: no data returned');
    }

    return { contact: data, wasCreated: true };
  }
}
