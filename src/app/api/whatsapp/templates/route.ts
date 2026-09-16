import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import { normalizeStatus } from '@/lib/whatsapp/template-mapping'

/**
 * Submit a new WhatsApp message template to Meta for approval and store
 * the resulting row locally.
 *
 * Previously "New Template" only wrote to Supabase with status 'Draft'
 * and never called Meta â€” the row could never leave Draft because Meta
 * never saw it. This submits the template to
 * POST /{waba_id}/message_templates first; the local row is only created
 * once Meta accepts it, carrying whatever status Meta returns (normally
 * PENDING while it's under review).
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

const NAME_PATTERN = /^[a-z0-9_]+$/

interface CreateTemplateBody {
  name?: string
  category?: 'Marketing' | 'Utility' | 'Authentication'
  language?: string
  body_text?: string
  header_type?: string | null
  header_content?: string | null
  footer_text?: string | null
}

interface MetaErrorResponse {
  error?: { message?: string; error_user_msg?: string }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await request.json()) as CreateTemplateBody

    const name = payload.name?.trim().toLowerCase().replace(/\s+/g, '_') ?? ''
    const bodyText = payload.body_text?.trim() ?? ''
    const language = payload.language?.trim() || 'en_US'
    const category = payload.category ?? 'Marketing'
    const headerType = payload.header_type || null
    const headerContent = payload.header_content?.trim() || null
    const footerText = payload.footer_text?.trim() || null

    if (!name || !NAME_PATTERN.test(name)) {
      return NextResponse.json(
        { error: 'Template name must use only lowercase letters, numbers and underscores (e.g. order_confirmation).' },
        { status: 400 },
      )
    }
    if (!bodyText) {
      return NextResponse.json({ error: 'Body text is required.' }, { status: 400 })
    }
    if (headerType && headerType !== 'text') {
      return NextResponse.json(
        {
          error: `Header type "${headerType}" isn't supported from here yet â€” image/video/document headers require uploading a sample file to Meta first. Create it directly in Meta Business Manager, then click "Sync from Meta" to pull it in.`,
        },
        { status: 400 },
      )
    }
    if (headerType === 'text' && !headerContent) {
      return NextResponse.json({ error: 'Header text is required when header type is Text.' }, { status: 400 })
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'WhatsApp not configured. Connect your WhatsApp Business account in Settings first.' },
        { status: 400 },
      )
    }
    if (!config.waba_id) {
      return NextResponse.json(
        { error: 'WABA (WhatsApp Business Account) ID missing. Re-connect your account in Settings.' },
        { status: 400 },
      )
    }

    const accessToken = decrypt(config.access_token)

    const components: Record<string, unknown>[] = []
    if (headerType === 'text' && headerContent) {
      components.push({ type: 'HEADER', format: 'TEXT', text: headerContent })
    }
    components.push({ type: 'BODY', text: bodyText })
    if (footerText) {
      components.push({ type: 'FOOTER', text: footerText })
    }

    const metaRes = await fetch(`${META_API_BASE}/${config.waba_id}/message_templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name,
        language,
        category: category.toUpperCase(),
        components,
      }),
    })

    const metaBody: { id?: string; status?: string } & MetaErrorResponse = await metaRes
      .json()
      .catch(() => ({}))

    if (!metaRes.ok) {
      const message =
        metaBody?.error?.error_user_msg ||
        metaBody?.error?.message ||
        `Meta API error: ${metaRes.status}`
      return NextResponse.json({ error: message }, { status: 502 })
    }

    const row = {
      user_id: user.id,
      name,
      category,
      language,
      header_type: headerType,
      header_content: headerType === 'text' ? headerContent : null,
      body_text: bodyText,
      footer_text: footerText,
      status: normalizeStatus(metaBody.status || 'PENDING'),
    }

    const { data: inserted, error: insertError } = await supabase
      .from('message_templates')
      .insert(row)
      .select()
      .single()

    if (insertError || !inserted) {
      return NextResponse.json(
        {
          error: `Template was submitted to Meta (id ${metaBody.id}) but saving it locally failed: ${insertError?.message ?? 'no data returned'}. Use "Sync from Meta" to pull it in.`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, template: inserted })
  } catch (error) {
    console.error('Error creating WhatsApp template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 },
    )
  }
}
