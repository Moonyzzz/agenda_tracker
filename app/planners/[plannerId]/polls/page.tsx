import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ plannerId: string }>
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-stone-100 text-stone-500',
}

export default async function PollsPage({ params }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId } = await params

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: planner } = await supabase
    .from('planners')
    .select('name')
    .eq('id', plannerId)
    .single()

  const { data: polls } = await supabase
    .from('polls')
    .select('id, status, approval_threshold, expires_at, event_data, created_at')
    .eq('planner_id', plannerId)
    .order('created_at', { ascending: false })

  const canCreate = membership.role === 'owner' || membership.role === 'editor'

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href={`/planners/${plannerId}`} className="text-sm text-stone-500 hover:text-stone-900">
            &larr; {planner?.name ?? 'Planner'}
          </Link>
          {canCreate && (
            <Link
              href={`/planners/${plannerId}/polls/new`}
              className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              + New poll
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-xl font-semibold text-stone-900">Polls</h1>

        {(!polls || polls.length === 0) ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-sm text-stone-400">No polls yet.</p>
            {canCreate && (
              <Link href={`/planners/${plannerId}/polls/new`}
                className="mt-3 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
                Propose an event
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => {
              const ed = poll.event_data as Record<string, unknown>
              return (
                <Link
                  key={poll.id}
                  href={`/planners/${plannerId}/polls/${poll.id}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{String(ed.name ?? 'Untitled')}</p>
                      {ed.start_time && (
                        <p className="mt-0.5 text-xs text-stone-500">
                          {new Date(String(ed.start_time)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[poll.status] ?? ''}`}>
                      {poll.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-400">
                    Threshold: {poll.approval_threshold} · Expires {new Date(poll.expires_at).toLocaleDateString()}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
