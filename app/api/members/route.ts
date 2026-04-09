import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const plannerId = searchParams.get('planner_id')
  if (!plannerId) return NextResponse.json({ error: 'planner_id required' }, { status: 400 })

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: members, error } = await supabase
    .from('planner_members')
    .select('id, user_id, role, joined_at, invited_by')
    .eq('planner_id', plannerId)
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ members, user_role: membership.role })
}

export async function DELETE(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const plannerId = searchParams.get('planner_id')
  const targetUserId = searchParams.get('user_id')

  if (!plannerId || !targetUserId) {
    return NextResponse.json({ error: 'planner_id and user_id required' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  const { error } = await supabase
    .from('planner_members')
    .delete()
    .eq('planner_id', plannerId)
    .eq('user_id', targetUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
