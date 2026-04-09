'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, inviteEmailHtml } from '@/lib/email'

function serviceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function inviteMember(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = formData.get('role') as string

  if (!email) redirect(`/planners/${plannerId}/members?error=Email+is+required`)
  if (!['editor', 'observer'].includes(role)) {
    redirect(`/planners/${plannerId}/members?error=Invalid+role`)
  }

  // Verify caller is owner
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    redirect(`/planners/${plannerId}/members?error=Only+owners+can+invite+members`)
  }

  const { data: planner } = await supabase
    .from('planners')
    .select('name')
    .eq('id', plannerId)
    .single()

  // Create invite token (use service role to bypass RLS insert check on email uniqueness)
  const admin = serviceRoleClient()
  const { data: invite, error } = await admin
    .from('planner_invites')
    .insert({
      planner_id: plannerId,
      email,
      role,
      invited_by: user.id,
    })
    .select('token')
    .single()

  if (error || !invite) {
    redirect(`/planners/${plannerId}/members?error=${encodeURIComponent(error?.message ?? 'Failed to create invite')}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${invite.token}`

  await sendEmail({
    to: email,
    subject: `You've been invited to "${planner?.name ?? 'a planner'}"`,
    html: inviteEmailHtml(planner?.name ?? 'a planner', user.email ?? '', inviteUrl, role),
  })

  redirect(`/planners/${plannerId}/members?success=Invite+sent+to+${encodeURIComponent(email)}`)
}

export async function removeMember(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string
  const targetUserId = formData.get('user_id') as string

  // Verify caller is owner
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    redirect(`/planners/${plannerId}/members?error=Only+owners+can+remove+members`)
  }

  // Cannot remove yourself (owner)
  if (targetUserId === user.id) {
    redirect(`/planners/${plannerId}/members?error=Cannot+remove+yourself`)
  }

  const { error } = await supabase
    .from('planner_members')
    .delete()
    .eq('planner_id', plannerId)
    .eq('user_id', targetUserId)

  if (error) {
    redirect(`/planners/${plannerId}/members?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/planners/${plannerId}/members`)
}

export async function acceptInvite(token: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const admin = serviceRoleClient()

  // Look up invite
  const { data: invite, error: lookupError } = await admin
    .from('planner_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (lookupError || !invite) return { error: 'invalid_token' }
  if (invite.accepted_at) return { error: 'already_used' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'expired' }

  // Check if already a member
  const { data: existing } = await admin
    .from('planner_members')
    .select('id')
    .eq('planner_id', invite.planner_id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    const { error: memberError } = await admin
      .from('planner_members')
      .insert({
        planner_id: invite.planner_id,
        user_id: user.id,
        role: invite.role,
        invited_by: invite.invited_by,
      })

    if (memberError) return { error: memberError.message }
  }

  // Mark invite as accepted
  await admin
    .from('planner_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { plannerId: invite.planner_id }
}
