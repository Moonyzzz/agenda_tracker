import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { finalizePollIfNeeded } from '@/lib/polls'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: expired, error } = await supabase
    .from('polls')
    .update({ status: 'expired' })
    .eq('status', 'open')
    .lt('expires_at', now)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: openPolls, error: openPollsError } = await supabase
    .from('polls')
    .select('id, created_by')
    .eq('status', 'open')
    .gte('expires_at', now)

  if (openPollsError) {
    return NextResponse.json({ error: openPollsError.message }, { status: 500 })
  }

  let autoApproved = 0
  for (const poll of openPolls ?? []) {
    const result = await finalizePollIfNeeded(supabase, poll.id, poll.created_by)
    if (result.status === 'approved') {
      autoApproved++
    }
  }

  return NextResponse.json({
    expired: expired?.length ?? 0,
    autoApproved,
  })
}
