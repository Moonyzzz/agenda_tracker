import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function serviceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = serviceRoleClient()

  const { data: invite, error } = await admin
    .from('planner_invites')
    .select('email, role, expires_at, accepted_at, status, planners(name)')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  }

  if (invite.status === 'accepted' || invite.accepted_at) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 })
  }

  if (invite.status === 'declined' || invite.status === 'revoked') {
    return NextResponse.json({ error: 'Unavailable' }, { status: 410 })
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    expires_at: invite.expires_at,
  })
}
