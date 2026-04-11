import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail, reminderEmailHtml } from '@/lib/email'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = serviceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const now = new Date()
  const in18h = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString()
  const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString()

  // 24h pre-event confirmation: events starting in 18–26h, confirmation not yet sent
  const { data: confirmEvents } = await supabase
    .from('events')
    .select('id, name, start_time, reminder_email, planner_id')
    .eq('confirmation_sent', false)
    .gte('start_time', in18h)
    .lte('start_time', in26h)
    .not('reminder_email', 'is', null)

  let confirmSent = 0
  for (const event of confirmEvents ?? []) {
    const confirmUrl = `${appUrl}/confirm/${event.id}`
    const sent = await sendEmail({
      to: event.reminder_email,
      subject: `Upcoming: ${event.name}`,
      html: reminderEmailHtml(
        event.name,
        new Date(event.start_time).toLocaleString(),
        confirmUrl
      ),
    })
    if (sent) {
      await supabase.from('events').update({ confirmation_sent: true }).eq('id', event.id)
      confirmSent++
    }
  }

  // Custom reminders: reminder_enabled events starting within the next hour.
  // Note: confirmation_sent is intentionally NOT checked here — it belongs to the
  // 24h confirmation flow only. The 1-hour window + daily cron cadence prevents
  // duplicate sends without needing a separate flag.
  const in1h = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  const { data: reminderEvents } = await supabase
    .from('events')
    .select('id, name, start_time, reminder_email')
    .eq('reminder_enabled', true)
    .gte('start_time', now.toISOString())
    .lte('start_time', in1h)
    .not('reminder_email', 'is', null)

  let reminderSent = 0
  for (const event of reminderEvents ?? []) {
    const sent = await sendEmail({
      to: event.reminder_email,
      subject: `Reminder: ${event.name} starts soon`,
      html: reminderEmailHtml(
        event.name,
        new Date(event.start_time).toLocaleString(),
        `${appUrl}/planners`
      ),
    })
    if (sent) reminderSent++
  }

  return NextResponse.json({ confirmSent, reminderSent })
}
