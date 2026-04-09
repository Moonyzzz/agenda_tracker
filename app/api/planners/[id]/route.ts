import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Check membership
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: planner, error } = await supabase
    .from('planners')
    .select('id, owner_id, name, bg_color, day_color, created_at')
    .eq('id', id)
    .single()

  if (error || !planner) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get member count
  const { count } = await supabase
    .from('planner_members')
    .select('*', { count: 'exact', head: true })
    .eq('planner_id', id)

  return NextResponse.json({
    planner: {
      ...planner,
      member_count: count ?? 0,
      user_role: membership.role,
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Check membership with owner or editor role
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'editor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { name?: string; bg_color?: string; day_color?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }
    updates.name = trimmed
  }
  if (body.bg_color !== undefined) updates.bg_color = body.bg_color
  if (body.day_color !== undefined) updates.day_color = body.day_color

  const { data: planner, error } = await supabase
    .from('planners')
    .update(updates)
    .eq('id', id)
    .select('id, owner_id, name, bg_color, day_color, created_at')
    .single()

  if (error || !planner) {
    return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 })
  }

  // Get member count
  const { count } = await supabase
    .from('planner_members')
    .select('*', { count: 'exact', head: true })
    .eq('planner_id', id)

  return NextResponse.json({
    planner: {
      ...planner,
      member_count: count ?? 0,
      user_role: membership.role,
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Only owner can delete
  const { error } = await supabase
    .from('planners')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}