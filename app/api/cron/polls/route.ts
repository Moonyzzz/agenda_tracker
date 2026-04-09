import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
  const now = new Date().toISOString()

  // Expire open polls past their expires_at
  const { data: expired, error } = await supabase
    .from('polls')
    .update({ status: 'expired' })
    .eq('status', 'open')
    .lt('expires_at', now)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // For each poll that just reached threshold but wasn't caught by real-time vote action,
  // check approve count vs threshold and auto-approve
  const { data: openPolls } = await supabase
    .from('polls')
    .select('id, planner_id, approval_threshold, event_data')
    .eq('status', 'open')
    .gte('expires_at', now)

  let autoApproved = 0
  for (const poll of openPolls ?? []) {
    const { count } = await supabase
      .from('poll_votes')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', poll.id)
      .eq('vote', 'approve')

    if ((count ?? 0) >= poll.approval_threshold) {
      const ed = poll.event_data as Record<string, unknown>
      await supabase.from('events').insert({
        planner_id: poll.planner_id,
        created_by: '00000000-0000-0000-0000-000000000000', // system
        name: ed.name,
        description: ed.description ?? null,
        start_time: ed.start_time,
        end_time: ed.end_time ?? null,
        participants: ed.participants ?? [],
        agenda: ed.agenda ?? null,
        notes: ed.notes ?? null,
        recurrence_type: 'none',
      })
      await supabase.from('polls').update({ status: 'approved' }).eq('id', poll.id)
      autoApproved++
    }
  }

  return NextResponse.json({
    expired: expired?.length ?? 0,
    autoApproved,
  })
}
