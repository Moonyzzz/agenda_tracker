import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const plannerId = searchParams.get('planner_id')
  if (!plannerId) return NextResponse.json({ error: 'planner_id required' }, { status: 400 })

  // Verify membership
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('planner_id', plannerId)
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events })
}
