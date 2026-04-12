import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import PollCard, { type PollData } from '@/components/PollCard'

interface Props {
  params: Promise<{ plannerId: string; pollId: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function PollDetailPage({ params, searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId, pollId } = await params
  const { error } = await searchParams

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: poll } = await supabase
    .from('polls')
    .select('id, planner_id, status, approval_threshold, expires_at, event_data')
    .eq('id', pollId)
    .eq('planner_id', plannerId)
    .single()

  if (!poll) redirect(`/planners/${plannerId}/polls`)

  const { data: votes } = await supabase
    .from('poll_votes')
    .select('user_id, vote')
    .eq('poll_id', pollId)

  const { data: suggestions } = await supabase
    .from('poll_suggestions')
    .select('id, field_name, suggested_value, status')
    .eq('poll_id', pollId)
    .order('created_at', { ascending: true })

  const suggestionIds = (suggestions ?? []).map((suggestion) => suggestion.id)
  const { data: suggestionVotes } = suggestionIds.length > 0
    ? await supabase
        .from('suggestion_votes')
        .select('suggestion_id, user_id, vote')
        .in('suggestion_id', suggestionIds)
    : { data: [] }

  const pollData: PollData = {
    ...poll,
    event_data: poll.event_data as Record<string, unknown>,
    votes: votes ?? [],
    suggestions: (suggestions ?? []).map((suggestion) => ({
      ...suggestion,
      votes: (suggestionVotes ?? []).filter((vote) => vote.suggestion_id === suggestion.id),
    })),
  }

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href={`/planners/${plannerId}/polls`} className="text-sm text-stone-500 hover:text-stone-900">
            &larr; Polls
          </Link>
          <span className="text-stone-300">/</span>
          <span className="truncate text-sm text-stone-600">
            {String((poll.event_data as Record<string, unknown>).name ?? 'Poll')}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <PollCard poll={pollData} userId={user.id} userRole={membership.role} />
      </main>
    </div>
  )
}
