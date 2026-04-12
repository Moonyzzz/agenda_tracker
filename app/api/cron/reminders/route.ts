import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const in18h = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString()
  const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString()
  const in1h = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

  const { data: confirmationEvents, error: confirmationError } = await supabase
    .from('events')
    .select('id')
    .eq('confirmation_acknowledged', false)
    .gte('start_time', in18h)
    .lte('start_time', in26h)

  if (confirmationError) {
    return NextResponse.json({ error: confirmationError.message }, { status: 500 })
  }

  const { data: reminderEvents, error: reminderError } = await supabase
    .from('events')
    .select('id')
    .eq('reminder_enabled', true)
    .gte('start_time', now.toISOString())
    .lte('start_time', in1h)

  if (reminderError) {
    return NextResponse.json({ error: reminderError.message }, { status: 500 })
  }

  return NextResponse.json({
    confirmationQueue: confirmationEvents?.length ?? 0,
    reminderQueue: reminderEvents?.length ?? 0,
  })
}
