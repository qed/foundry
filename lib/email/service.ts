import { createServiceClient } from '@/lib/supabase/server'

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Helix Foundry <noreply@helix-foundry.com>'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text: string
  userId?: string
  eventType: string
  templateName: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email via Resend API. Gracefully no-ops when RESEND_API_KEY is not set.
 * Logs all send attempts to email_log table.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn(`[Email] Skipping email (no RESEND_API_KEY): ${params.eventType} to ${params.to}`)
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const supabase = createServiceClient()

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Resend API error ${response.status}: ${errorBody}`)
    }

    const data = await response.json()
    const messageId = data.id as string

    // Log successful send
    await supabase.from('email_log').insert({
      user_id: params.userId || null,
      email_address: params.to,
      event_type: params.eventType,
      subject: params.subject,
      template_name: params.templateName,
      delivery_status: 'sent',
      resend_message_id: messageId,
    })

    return { success: true, messageId }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Email] Failed to send ${params.eventType} to ${params.to}:`, errorMessage)

    // Log failed send
    await supabase.from('email_log').insert({
      user_id: params.userId || null,
      email_address: params.to,
      event_type: params.eventType,
      subject: params.subject,
      template_name: params.templateName,
      delivery_status: 'failed',
      error_message: errorMessage,
    })

    return { success: false, error: errorMessage }
  }
}
