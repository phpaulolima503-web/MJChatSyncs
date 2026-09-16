import { SupabaseClient } from '@supabase/supabase-js';

export class SyncRepository {
  private client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }

  async syncLead(organizationId: string, lead: { phone: string; name: string }) {
    const { data: existing } = await this.client
      .from('contacts')
      .select()
      .eq('user_id', organizationId)
      .eq('phone', lead.phone)
      .maybeSingle();

    const { data, error } = await this.client
      .from('contacts')
      .upsert(
        { user_id: organizationId, phone: lead.phone, name: lead.name },
        { onConflict: 'user_id,phone' }
      )
      .select()
      .single();

    if (error || !data) {
      throw new Error(`syncLead failed: ${error?.message ?? 'no data returned'}`);
    }

    return { contact: data, wasCreated: !existing };
  }
}
