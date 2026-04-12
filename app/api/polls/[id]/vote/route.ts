import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { finalizePollIfNeeded } from '@/lib/polls'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { vote } = await request.json()

  if (!['approve', 'reject'].includes(vote)) {
    return NextResponse.json({ error: 'vote must be approve or reject' }, { status: 400 })
  }

  const { data: poll } = await supabase
    .from('polls')
    .select('planner_id, status')
    .eq('id', id)
    .single()

  if (!poll) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (poll.status !== 'open') return NextResponse.json({ error: 'Poll is closed' }, { status: 409 })

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', poll.planner_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: voteError } = await supabase
    .from('poll_votes')
    .upsert({ poll_id: id, user_id: user.id, vote }, { onConflict: 'poll_id,user_id' })

  if (voteError) return NextResponse.json({ error: voteError.message }, { status: 500 })

  const finalize = await finalizePollIfNeeded(supabase, id, user.id)
  if (finalize.error) {
    return NextResponse.json({ error: finalize.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: finalize.status })
}
