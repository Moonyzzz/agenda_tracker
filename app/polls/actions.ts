'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { finalizePollIfNeeded } from '@/lib/polls'
import { parseEventFormData } from '@/lib/events'

export async function createPoll(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string
  const parsed = parseEventFormData(formData)
  if ('error' in parsed) {
    redirect(`/planners/${plannerId}/polls/new?error=${encodeURIComponent(parsed.error)}`)
  }

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
    name: parsed.name,
    description: parsed.description,
    start_time: parsed.startTime,
    end_time: parsed.endTime,
    participants: parsed.participants,
    agenda: parsed.agenda,
    notes: parsed.notes,
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

  const { error: voteError } = await supabase
    .from('poll_votes')
    .upsert({ poll_id: pollId, user_id: user.id, vote }, { onConflict: 'poll_id,user_id' })
  if (voteError) {
    revalidatePath(`/planners/${plannerId}/polls/${pollId}`)
    redirect(`/planners/${plannerId}/polls/${pollId}?error=${encodeURIComponent(voteError.message)}`)
  }

  const finalize = await finalizePollIfNeeded(supabase, pollId, user.id)
  if (finalize.error) {
    revalidatePath(`/planners/${plannerId}/polls/${pollId}`)
    redirect(`/planners/${plannerId}/polls/${pollId}?error=${encodeURIComponent(finalize.error)}`)
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

  const { error } = await supabase.from('poll_suggestions').insert({
    poll_id: pollId,
    suggested_by: user.id,
    field_name: fieldName,
    suggested_value: suggestedValue,
    status: 'open',
  })
  if (error) {
    redirect(`/planners/${plannerId}/polls/${pollId}?error=${encodeURIComponent(error.message)}`)
  }

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

  const { error: voteError } = await supabase
    .from('suggestion_votes')
    .upsert({ suggestion_id: suggestionId, user_id: user.id, vote }, { onConflict: 'suggestion_id,user_id' })
  if (voteError) {
    redirect(`/planners/${plannerId}/polls/${pollId}?error=${encodeURIComponent(voteError.message)}`)
  }

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
      const { error: suggestionError } = await supabase
        .from('poll_suggestions')
        .update({ status: 'accepted' })
        .eq('id', suggestionId)
      if (suggestionError) {
        redirect(`/planners/${plannerId}/polls/${pollId}?error=${encodeURIComponent(suggestionError.message)}`)
      }

      const { data: poll } = await supabase
        .from('polls')
        .select('event_data')
        .eq('id', suggestion.poll_id)
        .single()

      if (poll) {
        const updated = { ...(poll.event_data as Record<string, unknown>), [suggestion.field_name]: suggestion.suggested_value }
        const { error: pollError } = await supabase.from('polls').update({ event_data: updated }).eq('id', suggestion.poll_id)
        if (pollError) {
          redirect(`/planners/${plannerId}/polls/${pollId}?error=${encodeURIComponent(pollError.message)}`)
        }
      }
    }
  }

  revalidatePath(`/planners/${plannerId}/polls/${pollId}`)
}
