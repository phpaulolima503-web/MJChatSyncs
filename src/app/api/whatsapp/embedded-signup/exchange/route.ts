import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeEmbeddedSignupCode, getWabaPhoneNumbers } from '@/lib/whatsapp/meta-api'

/**
 * POST /api/whatsapp/embedded-signup/exchange
 *
 * Second half of the WhatsApp Coexistence onboarding flow (Meta Embedded
 * Signup). The browser gets an authorization `code` from FB.login() and a
 * `waba_id` from the WA_EMBEDDED_SIGNUP postMessage event; this route does
 * everything that needs the app secret: exchanges the code for a business
 * access token, then resolves that WABA's already-registered phone number
 * so the client never has to know (or ask the user for) a phone_number_id.
 *
 * The caller is expected to take this response and POST it straight to
 * the existing /api/whatsapp/config route, which already handles
 * verification, encryption and storage — this route only does the parts
 * that route can't (it has no app secret and no code to exchange).
 */
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

    const { code, waba_id } = await request.json()
    if (!code || !waba_id) {
      return NextResponse.json(
        { error: 'code and waba_id are required' },
        { status: 400 }
      )
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'Embedded Signup is not configured on this server' },
        { status: 500 }
      )
    }

    let accessToken: string
    try {
      const result = await exchangeEmbeddedSignupCode({ code, appId, appSecret })
      accessToken = result.accessToken
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('[embedded-signup] code exchange failed:', message)
      return NextResponse.json({ error: `Meta API error: ${message}` }, { status: 400 })
    }

    let phoneNumbers
    try {
      phoneNumbers = await getWabaPhoneNumbers({ wabaId: waba_id, accessToken })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('[embedded-signup] phone number lookup failed:', message)
      return NextResponse.json({ error: `Meta API error: ${message}` }, { status: 400 })
    }

    // Prefer the number the flow actually connected (is_on_biz_app +
    // CLOUD_API). Falls back to the first entry so onboarding still
    // completes if Meta ever omits those fields for this account.
    const match =
      phoneNumbers.find((p) => p.is_on_biz_app && p.platform_type === 'CLOUD_API') ??
      phoneNumbers[0]

    if (!match) {
      return NextResponse.json(
        { error: 'No phone number found on this WhatsApp Business Account' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      access_token: accessToken,
      waba_id,
      phone_number_id: match.id,
      display_phone_number: match.display_phone_number,
      verified_name: match.verified_name || null,
    })
  } catch (error) {
    console.error('Error in embedded-signup exchange:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
