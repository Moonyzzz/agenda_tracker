const RESEND_API_URL = 'https://api.resend.com/emails'

// Set RESEND_FROM_EMAIL in your environment to a Resend-verified address.
// Falls back to Resend's shared sandbox sender which works without domain verification.
const DEFAULT_FROM = 'Agenda Tracker <onboarding@resend.dev>'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return false
  }

  const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[email] Resend error ${res.status}: ${body}`)
  }

  return res.ok
}

export function inviteEmailHtml(plannerName: string, inviterEmail: string, inviteUrl: string, role: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1c1917;">
  <h2 style="margin-bottom: 8px;">You've been invited to a planner</h2>
  <p style="color: #78716c; margin-bottom: 24px;">
    <strong>${inviterEmail}</strong> invited you to join
    <strong>${plannerName}</strong> as an <strong>${role}</strong>.
  </p>
  <a href="${inviteUrl}"
     style="display: inline-block; background: #1c1917; color: #fff; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 500; margin-bottom: 24px;">
    Accept invitation
  </a>
  <p style="color: #a8a29e; font-size: 12px;">
    This link expires in 7 days. If you did not expect this invitation, you can ignore this email.
  </p>
</body>
</html>`
}

export function reminderEmailHtml(eventName: string, startTime: string, confirmUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px; color: #1c1917;">
  <h2 style="margin-bottom: 8px;">Upcoming event reminder</h2>
  <p style="color: #78716c; margin-bottom: 8px;">
    Your event <strong>${eventName}</strong> is coming up on <strong>${startTime}</strong>.
  </p>
  <p style="color: #78716c; margin-bottom: 24px;">
    Please confirm whether everything is still on track.
  </p>
  <a href="${confirmUrl}"
     style="display: inline-block; background: #1c1917; color: #fff; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 500; margin-bottom: 24px;">
    Confirm event
  </a>
  <p style="color: #a8a29e; font-size: 12px;">
    If you need to make changes, you can edit the event after confirming.
  </p>
</body>
</html>`
}
