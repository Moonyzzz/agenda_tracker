'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const admin = createAdminClient()
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const matchingUser = authUsers?.users.find((candidate) => candidate.email?.toLowerCase() === email)

  if (matchingUser) {
    const { data: currentMember } = await supabase
      .from('planner_members')
      .select('id')
      .eq('planner_id', plannerId)
      .eq('user_id', matchingUser.id)
      .single()

    if (currentMember) {
      redirect(`/planners/${plannerId}/members?error=${encodeURIComponent(`${email} is already a member`)}`)
    }
  }

  const { data: existingInvite } = await supabase
    .from('planner_invites')
    .select('id')
    .eq('planner_id', plannerId)
    .eq('email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    redirect(`/planners/${plannerId}/members?error=${encodeURIComponent(`A pending invite already exists for ${email}`)}`)
  }

  const { error } = await supabase
    .from('planner_invites')
    .insert({
      planner_id: plannerId,
      email,
      role,
      invited_by: user.id,
      status: 'pending',
    })

  if (error) {
    redirect(`/planners/${plannerId}/members?error=${encodeURIComponent(error?.message ?? 'Failed to create invite')}`)
  }

  redirect(`/planners/${plannerId}/members?success=${encodeURIComponent(`Invite created for ${email}${matchingUser ? '' : `. It will appear after they sign up.`}`)}`)
}

export async function changeRole(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string
  const targetUserId = formData.get('user_id') as string
  const newRole = formData.get('role') as string

  if (!['editor', 'observer'].includes(newRole)) {
    redirect(`/planners/${plannerId}/members?error=Invalid+role`)
  }

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    redirect(`/planners/${plannerId}/members?error=Only+owners+can+change+roles`)
  }

  if (targetUserId === user.id) {
    redirect(`/planners/${plannerId}/members?error=Cannot+change+your+own+role`)
  }

  const { error } = await supabase
    .from('planner_members')
    .update({ role: newRole })
    .eq('planner_id', plannerId)
    .eq('user_id', targetUserId)

  if (error) {
    redirect(`/planners/${plannerId}/members?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/planners/${plannerId}/members?success=Role+updated`)
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

async function resolveInviteForUser(inviteId: string, userId: string, userEmail: string) {
  const admin = createAdminClient()

  const { data: invite, error } = await admin
    .from('planner_invites')
    .select('*')
    .eq('id', inviteId)
    .single()

  if (error || !invite) return { error: 'invalid_invite' }
  if (invite.status !== 'pending') return { error: invite.status }
  if (new Date(invite.expires_at) < new Date()) return { error: 'expired' }
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) return { error: 'email_mismatch' }

  const { data: existing } = await admin
    .from('planner_members')
    .select('id')
    .eq('planner_id', invite.planner_id)
    .eq('user_id', userId)
    .single()

  return { admin, invite, existing }
}

export async function acceptInviteAction(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/auth/login')

  const inviteId = formData.get('invite_id') as string
  const result = await resolveInviteForUser(inviteId, user.id, user.email)

  if ('error' in result) {
    redirect(`/dashboard?error=${encodeURIComponent('Could not accept invite')}`)
  }

  if (!result.existing) {
    const { error: memberError } = await result.admin
      .from('planner_members')
      .insert({
        planner_id: result.invite.planner_id,
        user_id: user.id,
        role: result.invite.role,
        invited_by: result.invite.invited_by,
      })

    if (memberError) {
      redirect(`/dashboard?error=${encodeURIComponent(memberError.message)}`)
    }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await result.admin
    .from('planner_invites')
    .update({ status: 'accepted', accepted_at: now, responded_at: now })
    .eq('id', result.invite.id)

  if (updateError) {
    redirect(`/dashboard?error=${encodeURIComponent(updateError.message)}`)
  }

  redirect(`/planners/${result.invite.planner_id}`)
}

export async function declineInviteAction(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/auth/login')

  const inviteId = formData.get('invite_id') as string
  const result = await resolveInviteForUser(inviteId, user.id, user.email)

  if ('error' in result) {
    redirect(`/dashboard?error=${encodeURIComponent('Could not decline invite')}`)
  }

  const now = new Date().toISOString()
  const { error } = await result.admin
    .from('planner_invites')
    .update({ status: 'declined', responded_at: now })
    .eq('id', result.invite.id)

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard?success=Invite+declined')
}

export async function revokeInviteAction(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string
  const inviteId = formData.get('invite_id') as string

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    redirect(`/planners/${plannerId}/members?error=Only+owners+can+revoke+invites`)
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('planner_invites')
    .update({ status: 'revoked', responded_at: now })
    .eq('id', inviteId)
    .eq('planner_id', plannerId)

  if (error) {
    redirect(`/planners/${plannerId}/members?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/planners/${plannerId}/members?success=Invite+revoked`)
}

export async function acceptInvite(token: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'not_authenticated' }

  const admin = createAdminClient()
  const { data: invite, error } = await admin
    .from('planner_invites')
    .select('id')
    .eq('token', token)
    .single()

  if (error || !invite) return { error: 'invalid_token' }

  const result = await resolveInviteForUser(invite.id, user.id, user.email)
  if ('error' in result) return { error: result.error }

  if (!result.existing) {
    const { error: memberError } = await result.admin
      .from('planner_members')
      .insert({
        planner_id: result.invite.planner_id,
        user_id: user.id,
        role: result.invite.role,
        invited_by: result.invite.invited_by,
      })
    if (memberError) return { error: memberError.message }
  }

  const now = new Date().toISOString()
  await result.admin
    .from('planner_invites')
    .update({ status: 'accepted', accepted_at: now, responded_at: now })
    .eq('id', result.invite.id)

  return { plannerId: result.invite.planner_id }
}
