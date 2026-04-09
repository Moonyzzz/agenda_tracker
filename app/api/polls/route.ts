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
    .from('planner_members').select('role')
    .eq('planner_id', plannerId).eq('user_id', user.id).single()

  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: polls, error } = await supabase
    .from('polls')
    .select('id, status, approval_threshold, expires_at, event_data, created_at, created_by')
    .eq('planner_id', plannerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ polls })
}
