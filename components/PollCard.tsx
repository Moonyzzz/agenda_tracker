'use client'

import { useEffect, useState } from 'react'
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
  const canVote = userRole === 'editor' || userRole === 'owner'
  const isOpen = poll.status === 'open'
  const isExpired = isOpen && new Date(poll.expires_at) < new Date()

  const approveCount = poll.votes.filter((v) => v.vote === 'approve').length
  const rejectCount = poll.votes.filter((v) => v.vote === 'reject').length
  const myVote = poll.votes.find((v) => v.user_id === userId)?.vote

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`poll:${poll.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${poll.id}` },
        () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_suggestions', filter: `poll_id=eq.${poll.id}` },
        () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestion_votes' },
        () => refetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'polls', filter: `id=eq.${poll.id}` },
        (payload) => {
          if (payload.new) setPoll((p) => ({ ...p, ...(payload.new as Partial<PollData>) }))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [poll.id])

  async function refetch() {
    const res = await fetch(`/api/polls/${poll.id}`)
    if (res.ok) {
      const { poll: fresh } = await res.json()
      if (fresh) setPoll(fresh)
    }
  }

  const ed = poll.event_data

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {poll.status !== 'open' && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          poll.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
          poll.status === 'expired' ? 'bg-stone-100 text-stone-500 border border-stone-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          Poll {poll.status}
          {poll.status === 'approved' && ' — event has been created'}
        </div>
      )}

      {isExpired && poll.status === 'open' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          This poll has expired and will be closed by the next scheduled job.
        </div>
      )}

      {/* Proposed event */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2 text-sm">
        <h3 className="font-semibold text-stone-900">{String(ed.name ?? '')}</h3>
        {ed.description != null && <p className="text-stone-600">{String(ed.description)}</p>}
        {ed.start_time != null && (
          <p className="text-stone-500">
            {new Date(String(ed.start_time)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            {ed.end_time != null && ` – ${new Date(String(ed.end_time)).toLocaleString(undefined, { timeStyle: 'short' })}`}
          </p>
        )}
        {Array.isArray(ed.participants) && ed.participants.length > 0 && (
          <p className="text-stone-500">Participants: {(ed.participants as string[]).join(', ')}</p>
        )}
        {ed.agenda != null && <p className="text-stone-500 whitespace-pre-wrap">{String(ed.agenda)}</p>}
      </div>

      {/* Vote counts */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{approveCount}</p>
          <p className="text-xs text-stone-500">Approve</p>
        </div>
        <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
          {(approveCount + rejectCount) > 0 && (
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

      <p className="text-xs text-stone-400 text-center">
        Threshold: {poll.approval_threshold} approval{poll.approval_threshold !== 1 ? 's' : ''} needed ·
        Expires {new Date(poll.expires_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
      </p>

      {/* Vote buttons */}
      {canVote && isOpen && !isExpired && (
        <div className="flex gap-3">
          <form action={castVote} className="flex-1">
            <input type="hidden" name="poll_id" value={poll.id} />
            <input type="hidden" name="planner_id" value={poll.planner_id} />
            <input type="hidden" name="vote" value="approve" />
            <button
              type="submit"
              className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                myVote === 'approve'
                  ? 'bg-green-600 text-white'
                  : 'border border-green-300 bg-white text-green-700 hover:bg-green-50'
              }`}
            >
              {myVote === 'approve' ? '✓ Approved' : 'Approve'}
            </button>
          </form>
          <form action={castVote} className="flex-1">
            <input type="hidden" name="poll_id" value={poll.id} />
            <input type="hidden" name="planner_id" value={poll.planner_id} />
            <input type="hidden" name="vote" value="reject" />
            <button
              type="submit"
              className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                myVote === 'reject'
                  ? 'bg-red-600 text-white'
                  : 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
              }`}
            >
              {myVote === 'reject' ? '✗ Rejected' : 'Reject'}
            </button>
          </form>
        </div>
      )}

      {/* Suggestions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-700">Suggestions</h3>
          {canVote && isOpen && !isExpired && (
            <button
              onClick={() => setShowSuggestForm((v) => !v)}
              className="text-xs text-stone-500 hover:text-stone-900 underline"
            >
              {showSuggestForm ? 'Cancel' : '+ Suggest change'}
            </button>
          )}
        </div>

        {showSuggestForm && (
          <form action={createSuggestion} className="mb-4 rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-3"
            onSubmit={() => setShowSuggestForm(false)}>
            <input type="hidden" name="poll_id" value={poll.id} />
            <input type="hidden" name="planner_id" value={poll.planner_id} />
            <div>
              <label className="block text-xs font-medium text-stone-700">Field</label>
              <select name="field_name" className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none">
                {Object.entries(FIELD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700">Suggested value</label>
              <input name="suggested_value" type="text" required
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none"
                placeholder="Enter suggested value" />
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
            {poll.suggestions.map((s) => {
              const sApprove = s.votes.filter((v) => v.vote === 'approve').length
              const sReject = s.votes.filter((v) => v.vote === 'reject').length
              const myVoteS = s.votes.find((v) => v.user_id === userId)?.vote
              return (
                <div key={s.id} className={`rounded-lg border p-3 text-sm ${s.status === 'accepted' ? 'border-green-200 bg-green-50' : 'border-stone-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium text-stone-700">{FIELD_LABELS[s.field_name] ?? s.field_name}:</span>{' '}
                      <span className="text-stone-900">{s.suggested_value}</span>
                      {s.status === 'accepted' && <span className="ml-2 text-xs text-green-600 font-medium">Accepted</span>}
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">{sApprove}↑ {sReject}↓</span>
                  </div>
                  {canVote && isOpen && !isExpired && s.status === 'open' && (
                    <div className="mt-2 flex gap-2">
                      <form action={voteSuggestion}>
                        <input type="hidden" name="suggestion_id" value={s.id} />
                        <input type="hidden" name="poll_id" value={poll.id} />
                        <input type="hidden" name="planner_id" value={poll.planner_id} />
                        <input type="hidden" name="vote" value="approve" />
                        <button type="submit" className={`rounded px-2 py-1 text-xs font-medium ${myVoteS === 'approve' ? 'bg-green-600 text-white' : 'border border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
                          Approve
                        </button>
                      </form>
                      <form action={voteSuggestion}>
                        <input type="hidden" name="suggestion_id" value={s.id} />
                        <input type="hidden" name="poll_id" value={poll.id} />
                        <input type="hidden" name="planner_id" value={poll.planner_id} />
                        <input type="hidden" name="vote" value="reject" />
                        <button type="submit" className={`rounded px-2 py-1 text-xs font-medium ${myVoteS === 'reject' ? 'bg-red-600 text-white' : 'border border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
                          Reject
                        </button>
                      </form>
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
