import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: poll, error } = await supabase
    .from('polls')
    .select('id, planner_id, status, approval_threshold, expires_at, event_data')
    .eq('id', id)
    .single()

  if (error || !poll) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('planner_members').select('role')
    .eq('planner_id', poll.planner_id).eq('user_id', user.id).single()

  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: votes } = await supabase
    .from('poll_votes').select('user_id, vote').eq('poll_id', id)

  const { data: suggestions } = await supabase
    .from('poll_suggestions')
    .select('id, field_name, suggested_value, status')
    .eq('poll_id', id)
    .order('created_at', { ascending: true })

  const suggestionIds = (suggestions ?? []).map((s) => s.id)
  const { data: suggestionVotes } = suggestionIds.length > 0
    ? await supabase.from('suggestion_votes').select('suggestion_id, user_id, vote').in('suggestion_id', suggestionIds)
    : { data: [] }

  return NextResponse.json({
    poll: {
      ...poll,
      votes: votes ?? [],
      suggestions: (suggestions ?? []).map((s) => ({
        ...s,
        votes: (suggestionVotes ?? []).filter((v) => v.suggestion_id === s.id),
      })),
    },
    user_role: membership.role,
  })
}
