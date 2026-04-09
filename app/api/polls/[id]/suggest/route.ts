import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { field_name, suggested_value } = await request.json()

  if (!field_name || !suggested_value?.trim()) {
    return NextResponse.json({ error: 'field_name and suggested_value required' }, { status: 400 })
  }

  const { data: poll } = await supabase
    .from('polls').select('planner_id, status').eq('id', id).single()

  if (!poll) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (poll.status !== 'open') return NextResponse.json({ error: 'Poll is closed' }, { status: 409 })

  const { data: membership } = await supabase
    .from('planner_members').select('role').eq('planner_id', poll.planner_id).eq('user_id', user.id).single()

  if (!membership || membership.role === 'observer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase.from('poll_suggestions').insert({
    poll_id: id,
    suggested_by: user.id,
    field_name,
    suggested_value: suggested_value.trim(),
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ suggestion: data }, { status: 201 })
}
