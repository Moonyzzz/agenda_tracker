import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch planners where the user is a member
  const { data: memberships, error: memberError } = await supabase
    .from('planner_members')
    .select('planner_id')
    .eq('user_id', user.id)

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ planners: [] })
  }

  const plannerIds = memberships.map((m) => m.planner_id)

  const { data: planners, error: plannersError } = await supabase
    .from('planners')
    .select('id, owner_id, name, bg_color, day_color, created_at')
    .in('id', plannerIds)
    .order('created_at', { ascending: false })

  if (plannersError) {
    return NextResponse.json({ error: plannersError.message }, { status: 500 })
  }

  // Get member counts for all planners
  const { data: memberCounts } = await supabase
    .from('planner_members')
    .select('planner_id')
    .in('planner_id', plannerIds)

  const countMap = new Map<string, number>()
  for (const m of memberCounts ?? []) {
    countMap.set(m.planner_id, (countMap.get(m.planner_id) ?? 0) + 1)
  }

  const result = (planners ?? []).map((p) => ({
    ...p,
    member_count: countMap.get(p.id) ?? 0,
  }))

  return NextResponse.json({ planners: result })
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; bg_color?: string; day_color?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name as string)?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // INSERT RETURNING works because migration 0003 added owner_id = auth.uid()
  // to planners_select, and the bootstrap clause to planner_members_insert.
  const { data: planner, error: plannerError } = await supabase
    .from('planners')
    .insert({
      owner_id: user.id,
      name,
      bg_color: body.bg_color || '#ffffff',
      day_color: body.day_color || '#4f46e5',
    })
    .select('id, owner_id, name, bg_color, day_color, created_at')
    .single()

  if (plannerError || !planner) {
    return NextResponse.json({ error: plannerError?.message || 'Failed to create planner' }, { status: 500 })
  }

  // Add owner as planner_member
  const { error: memberError } = await supabase
    .from('planner_members')
    .insert({
      planner_id: planner.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ planner: { ...planner, member_count: 1 } }, { status: 201 })
}