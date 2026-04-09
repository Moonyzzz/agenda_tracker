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

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify membership
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', event.planner_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ event, user_role: membership.role })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: event } = await supabase
    .from('events')
    .select('planner_id')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', event.planner_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role === 'observer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('events')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ event: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: event } = await supabase
    .from('events')
    .select('planner_id')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', event.planner_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role === 'observer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
