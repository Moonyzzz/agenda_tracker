'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPoll(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role === 'observer') {
    redirect(`/planners/${plannerId}/polls?error=Only+editors+can+create+polls`)
  }

  const eventData = {
    name: (formData.get('name') as string)?.trim(),
    description: (formData.get('description') as string) || null,
    start_time: formData.get('start_time') as string,
    end_time: (formData.get('end_time') as string) || null,
    participants: (formData.get('participants') as string)
      ?.split(',').map((s) => s.trim()).filter(Boolean) ?? [],
    agenda: (formData.get('agenda') as string) || null,
    notes: (formData.get('notes') as string) || null,
  }

  if (!eventData.name) {
    redirect(`/planners/${plannerId}/polls/new?error=Name+is+required`)
  }

  const threshold = Number(formData.get('approval_threshold')) || 1
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { data: poll, error } = await supabase
    .from('polls')
    .insert({
      planner_id: plannerId,
      created_by: user.id,
      event_data: eventData,
      status: 'open',
      approval_threshold: threshold,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error || !poll) {
    redirect(`/planners/${plannerId}/polls/new?error=${encodeURIComponent(error?.message ?? 'Failed')}`)
  }

  redirect(`/planners/${plannerId}/polls/${poll.id}`)
}

export async function castVote(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const pollId = formData.get('poll_id') as string
  const plannerId = formData.get('planner_id') as string
  const vote = formData.get('vote') as string

  // Upsert vote
  await supabase
    .from('poll_votes')
    .upsert({ poll_id: pollId, user_id: user.id, vote }, { onConflict: 'poll_id,user_id' })

  // Check threshold
  const { data: poll } = await supabase
    .from('polls')
    .select('approval_threshold, status, event_data, planner_id')
    .eq('id', pollId)
    .single()

  if (poll && poll.status === 'open') {
    const { count: approveCount } = await supabase
      .from('poll_votes')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', pollId)
      .eq('vote', 'approve')

    if ((approveCount ?? 0) >= poll.approval_threshold) {
      // Auto-create event
      const ed = poll.event_data as Record<string, unknown>
      await supabase.from('events').insert({
        planner_id: poll.planner_id,
        created_by: user.id,
        name: ed.name,
        description: ed.description ?? null,
        start_time: ed.start_time,
        end_time: ed.end_time ?? null,
        participants: ed.participants ?? [],
        agenda: ed.agenda ?? null,
        notes: ed.notes ?? null,
        recurrence_type: 'none',
      })

      await supabase
        .from('polls')
        .update({ status: 'approved' })
        .eq('id', pollId)
    }
  }

  revalidatePath(`/planners/${plannerId}/polls/${pollId}`)
}

export async function createSuggestion(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const pollId = formData.get('poll_id') as string
  const plannerId = formData.get('planner_id') as string
  const fieldName = formData.get('field_name') as string
  const suggestedValue = (formData.get('suggested_value') as string)?.trim()

  if (!fieldName || !suggestedValue) return

  await supabase.from('poll_suggestions').insert({
    poll_id: pollId,
    suggested_by: user.id,
    field_name: fieldName,
    suggested_value: suggestedValue,
    status: 'open',
  })

  revalidatePath(`/planners/${plannerId}/polls/${pollId}`)
}

export async function voteSuggestion(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const suggestionId = formData.get('suggestion_id') as string
  const pollId = formData.get('poll_id') as string
  const plannerId = formData.get('planner_id') as string
  const vote = formData.get('vote') as string

  await supabase
    .from('suggestion_votes')
    .upsert({ suggestion_id: suggestionId, user_id: user.id, vote }, { onConflict: 'suggestion_id,user_id' })

  // Check if majority approved (>50% of all planner members who voted)
  const { count: totalMembers } = await supabase
    .from('planner_members')
    .select('*', { count: 'exact', head: true })
    .eq('planner_id', (await supabase.from('polls').select('planner_id').eq('id', pollId).single()).data?.planner_id ?? '')

  const { count: approveCount } = await supabase
    .from('suggestion_votes')
    .select('*', { count: 'exact', head: true })
    .eq('suggestion_id', suggestionId)
    .eq('vote', 'approve')

  if ((approveCount ?? 0) > (totalMembers ?? 1) / 2) {
    const { data: suggestion } = await supabase
      .from('poll_suggestions')
      .select('field_name, suggested_value, poll_id')
      .eq('id', suggestionId)
      .single()

    if (suggestion) {
      // Mark suggestion accepted and update poll event_data
      await supabase
        .from('poll_suggestions')
        .update({ status: 'accepted' })
        .eq('id', suggestionId)

      const { data: poll } = await supabase
        .from('polls')
        .select('event_data')
        .eq('id', suggestion.poll_id)
        .single()

      if (poll) {
        const updated = { ...(poll.event_data as Record<string, unknown>), [suggestion.field_name]: suggestion.suggested_value }
        await supabase.from('polls').update({ event_data: updated }).eq('id', suggestion.poll_id)
      }
    }
  }

  revalidatePath(`/planners/${plannerId}/polls/${pollId}`)
}
