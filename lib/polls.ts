type SupabaseLike = {
  from: (table: string) => any
}

type PollEventData = {
  name?: string
  description?: string | null
  start_time?: string
  end_time?: string
  participants?: string[]
  agenda?: string | null
  notes?: string | null
}

export async function finalizePollIfNeeded(
  supabase: SupabaseLike,
  pollId: string,
  approvedByUserId: string
): Promise<{ status: 'open' | 'approved' | 'skipped'; error?: string }> {
  const pollQuery = await (supabase.from('polls')
    .select('id, planner_id, approval_threshold, status, event_data, approved_event_id')
    .eq('id', pollId)
    .single() as Promise<{ data: { planner_id: string; approval_threshold: number; status: string; event_data: PollEventData; approved_event_id?: string | null } | null; error: { message: string } | null }>)

  if (pollQuery.error || !pollQuery.data) {
    return { status: 'skipped', error: pollQuery.error?.message ?? 'Poll not found' }
  }

  const poll = pollQuery.data
  if (poll.status !== 'open') {
    return { status: poll.status === 'approved' ? 'approved' : 'skipped' }
  }

  if (poll.approved_event_id) {
    await (supabase.from('polls')
      .update({ status: 'approved' })
      .eq('id', pollId) as Promise<{ error: { message: string } | null }>)
    return { status: 'approved' }
  }

  const approvalQuery = await (supabase.from('poll_votes')
    .select('*', { count: 'exact', head: true })
    .eq('poll_id', pollId)
    .eq('vote', 'approve') as Promise<{ count: number | null; error: { message: string } | null }>)

  if (approvalQuery.error) {
    return { status: 'skipped', error: approvalQuery.error.message }
  }

  if ((approvalQuery.count ?? 0) < poll.approval_threshold) {
    return { status: 'open' }
  }

  const eventData = poll.event_data ?? {}
  if (!eventData.name || !eventData.start_time || !eventData.end_time) {
    return { status: 'skipped', error: 'Poll event data is incomplete' }
  }

  const eventInsert = await (supabase.from('events')
    .insert({
      planner_id: poll.planner_id,
      created_by: approvedByUserId,
      name: eventData.name,
      description: eventData.description ?? null,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      participants: eventData.participants ?? [],
      agenda: eventData.agenda ?? null,
      notes: eventData.notes ?? null,
      recurrence_type: 'none',
    })
    .select('id')
    .single() as Promise<{ data: { id: string } | null; error: { message: string } | null }>)

  if (eventInsert.error || !eventInsert.data) {
    return { status: 'skipped', error: eventInsert.error?.message ?? 'Failed to create event' }
  }

  const updateQuery = await (supabase.from('polls')
    .update({ status: 'approved', approved_event_id: eventInsert.data.id })
    .eq('id', pollId) as Promise<{ error: { message: string } | null }>)

  if (updateQuery.error) {
    return { status: 'skipped', error: updateQuery.error.message }
  }

  return { status: 'approved' }
}
