'use client'

import { startTransition, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { castVote, createSuggestion, voteSuggestion } from '@/app/polls/actions'

export type PollData = {
  id: string
  planner_id: string
  status: string
  approval_threshold: number
  expires_at: string
  event_data: Record<string, unknown>
  votes: { user_id: string; vote: string }[]
  suggestions: {
    id: string
    field_name: string
    suggested_value: string
    status: string
    votes: { user_id: string; vote: string }[]
  }[]
}

interface Props {
  poll: PollData
  userId: string
  userRole: string
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  start_time: 'Start time',
  end_time: 'End time',
  participants: 'Participants',
  agenda: 'Agenda',
  notes: 'Notes',
}

export default function PollCard({ poll: initial, userId, userRole }: Props) {
  const [poll, setPoll] = useState(initial)
  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [submittingVote, setSubmittingVote] = useState<string | null>(null)
  const [submittingSuggestionVote, setSubmittingSuggestionVote] = useState<string | null>(null)
  const canVote = userRole === 'editor' || userRole === 'owner'
  const isOpen = poll.status === 'open'
  const isExpired = isOpen && new Date(poll.expires_at) < new Date()

  const approveCount = poll.votes.filter((vote) => vote.vote === 'approve').length
  const rejectCount = poll.votes.filter((vote) => vote.vote === 'reject').length
  const myVote = poll.votes.find((vote) => vote.user_id === userId)?.vote

  useEffect(() => {
    setPoll(initial)
  }, [initial])

  useEffect(() => {
    const channel = supabase
      .channel(`poll:${poll.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${poll.id}` },
        () => void refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_suggestions', filter: `poll_id=eq.${poll.id}` },
        () => void refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suggestion_votes' },
        () => void refetch()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'polls', filter: `id=eq.${poll.id}` },
        (payload) => {
          if (payload.new) {
            setPoll((current) => ({ ...current, ...(payload.new as Partial<PollData>) }))
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [poll.id])

  async function refetch() {
    const response = await fetch(`/api/polls/${poll.id}`, { cache: 'no-store' })
    if (response.ok) {
      const { poll: fresh } = await response.json()
      if (fresh) setPoll(fresh)
    }
  }

  function submitVote(vote: 'approve' | 'reject') {
    const previous = poll
    const optimisticVotes = [
      ...poll.votes.filter((entry) => entry.user_id !== userId),
      { user_id: userId, vote },
    ]

    setPoll((current) => ({ ...current, votes: optimisticVotes }))
    setSubmittingVote(vote)

    const formData = new FormData()
    formData.set('poll_id', poll.id)
    formData.set('planner_id', poll.planner_id)
    formData.set('vote', vote)

    startTransition(async () => {
      try {
        await castVote(formData)
        await refetch()
      } catch {
        setPoll(previous)
      } finally {
        setSubmittingVote(null)
      }
    })
  }

  function submitSuggestionVote(suggestionId: string, vote: 'approve' | 'reject') {
    const previous = poll
    const optimisticSuggestions = poll.suggestions.map((suggestion) =>
      suggestion.id === suggestionId
        ? {
            ...suggestion,
            votes: [
              ...suggestion.votes.filter((entry) => entry.user_id !== userId),
              { user_id: userId, vote },
            ],
          }
        : suggestion
    )

    setPoll((current) => ({ ...current, suggestions: optimisticSuggestions }))
    setSubmittingSuggestionVote(`${suggestionId}:${vote}`)

    const formData = new FormData()
    formData.set('suggestion_id', suggestionId)
    formData.set('poll_id', poll.id)
    formData.set('planner_id', poll.planner_id)
    formData.set('vote', vote)

    startTransition(async () => {
      try {
        await voteSuggestion(formData)
        await refetch()
      } catch {
        setPoll(previous)
      } finally {
        setSubmittingSuggestionVote(null)
      }
    })
  }

  const eventData = poll.event_data

  return (
    <div className="space-y-6">
      {poll.status !== 'open' && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            poll.status === 'approved'
              ? 'border-green-200 bg-green-50 text-green-700'
              : poll.status === 'expired'
                ? 'border-stone-200 bg-stone-100 text-stone-500'
                : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          Poll {poll.status}
          {poll.status === 'approved' && ' - event has been created'}
        </div>
      )}

      {isExpired && isOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          This poll has expired and will be closed by the next scheduled job.
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <h3 className="font-semibold text-stone-900">{String(eventData.name ?? '')}</h3>
        {eventData.description != null && <p className="text-stone-600">{String(eventData.description)}</p>}
        {eventData.start_time != null && (
          <p className="text-stone-500">
            {new Date(String(eventData.start_time)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            {eventData.end_time != null && ` - ${new Date(String(eventData.end_time)).toLocaleString(undefined, { timeStyle: 'short' })}`}
          </p>
        )}
        {Array.isArray(eventData.participants) && eventData.participants.length > 0 && (
          <p className="text-stone-500">Participants: {(eventData.participants as string[]).join(', ')}</p>
        )}
        {eventData.agenda != null && <p className="whitespace-pre-wrap text-stone-500">{String(eventData.agenda)}</p>}
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{approveCount}</p>
          <p className="text-xs text-stone-500">Approve</p>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
          {approveCount + rejectCount > 0 && (
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(approveCount / (approveCount + rejectCount)) * 100}%` }}
            />
          )}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">{rejectCount}</p>
          <p className="text-xs text-stone-500">Reject</p>
        </div>
      </div>

      <p className="text-center text-xs text-stone-400">
        Threshold: {poll.approval_threshold} approval{poll.approval_threshold !== 1 ? 's' : ''} needed · Expires{' '}
        {new Date(poll.expires_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
      </p>

      {canVote && isOpen && !isExpired && (
        <div className="flex gap-3">
          <div className="flex-1">
            <button
              type="button"
              disabled={submittingVote !== null}
              onClick={() => submitVote('approve')}
              className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                myVote === 'approve'
                  ? 'bg-green-600 text-white'
                  : 'border border-green-300 bg-white text-green-700 hover:bg-green-50'
              } ${submittingVote !== null ? 'opacity-70' : ''}`}
            >
              {myVote === 'approve' ? '✓ Approved' : 'Approve'}
            </button>
          </div>
          <div className="flex-1">
            <button
              type="button"
              disabled={submittingVote !== null}
              onClick={() => submitVote('reject')}
              className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                myVote === 'reject'
                  ? 'bg-red-600 text-white'
                  : 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
              } ${submittingVote !== null ? 'opacity-70' : ''}`}
            >
              {myVote === 'reject' ? '✗ Rejected' : 'Reject'}
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700">Suggestions</h3>
          {canVote && isOpen && !isExpired && (
            <button
              type="button"
              onClick={() => setShowSuggestForm((value) => !value)}
              className="text-xs text-stone-500 underline hover:text-stone-900"
            >
              {showSuggestForm ? 'Cancel' : '+ Suggest change'}
            </button>
          )}
        </div>

        {showSuggestForm && (
          <form
            action={createSuggestion}
            className="mb-4 space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
            onSubmit={() => setShowSuggestForm(false)}
          >
            <input type="hidden" name="poll_id" value={poll.id} />
            <input type="hidden" name="planner_id" value={poll.planner_id} />
            <div>
              <label className="block text-xs font-medium text-stone-700">Field</label>
              <select
                name="field_name"
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none"
              >
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700">Suggested value</label>
              <input
                name="suggested_value"
                type="text"
                required
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none"
                placeholder="Enter suggested value"
              />
            </div>
            <button type="submit" className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700">
              Submit suggestion
            </button>
          </form>
        )}

        {poll.suggestions.length === 0 ? (
          <p className="text-xs text-stone-400">No suggestions yet.</p>
        ) : (
          <div className="space-y-2">
            {poll.suggestions.map((suggestion) => {
              const suggestionApproveCount = suggestion.votes.filter((vote) => vote.vote === 'approve').length
              const suggestionRejectCount = suggestion.votes.filter((vote) => vote.vote === 'reject').length
              const mySuggestionVote = suggestion.votes.find((vote) => vote.user_id === userId)?.vote
              return (
                <div
                  key={suggestion.id}
                  className={`rounded-lg border p-3 text-sm ${
                    suggestion.status === 'accepted' ? 'border-green-200 bg-green-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium text-stone-700">{FIELD_LABELS[suggestion.field_name] ?? suggestion.field_name}:</span>{' '}
                      <span className="text-stone-900">{suggestion.suggested_value}</span>
                      {suggestion.status === 'accepted' && (
                        <span className="ml-2 text-xs font-medium text-green-600">Accepted</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-stone-400">
                      {suggestionApproveCount}↑ {suggestionRejectCount}↓
                    </span>
                  </div>
                  {canVote && isOpen && !isExpired && suggestion.status === 'open' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={submittingSuggestionVote !== null}
                        onClick={() => submitSuggestionVote(suggestion.id, 'approve')}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          mySuggestionVote === 'approve'
                            ? 'bg-green-600 text-white'
                            : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
                        } ${submittingSuggestionVote !== null ? 'opacity-70' : ''}`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={submittingSuggestionVote !== null}
                        onClick={() => submitSuggestionVote(suggestion.id, 'reject')}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          mySuggestionVote === 'reject'
                            ? 'bg-red-600 text-white'
                            : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
                        } ${submittingSuggestionVote !== null ? 'opacity-70' : ''}`}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
