import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createPoll } from '@/app/polls/actions'

interface Props {
  params: Promise<{ plannerId: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function NewPollPage({ params, searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId } = await params
  const { error } = await searchParams

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role === 'observer') redirect(`/planners/${plannerId}/polls`)

  const { data: planner } = await supabase
    .from('planners')
    .select('name')
    .eq('id', plannerId)
    .single()

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href={`/planners/${plannerId}/polls`} className="text-sm text-stone-500 hover:text-stone-900">
            &larr; Polls
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold text-stone-900">Propose an event</h1>
        <p className="mb-6 text-sm text-stone-500">
          Fill in the event details. Members will vote to approve or reject. The poll expires in 72 hours.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form action={createPoll} className="space-y-5">
          <input type="hidden" name="planner_id" value={plannerId} />

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-700">
              Event name <span className="text-red-500">*</span>
            </label>
            <input id="name" name="name" type="text" required
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder="e.g. Team lunch" />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-stone-700">Description</label>
            <textarea id="description" name="description" rows={3}
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder="What's this event about?" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-stone-700">
                Start <span className="text-red-500">*</span>
              </label>
              <input id="start_time" name="start_time" type="datetime-local" required
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500" />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-stone-700">
                End <span className="text-red-500">*</span>
              </label>
              <input id="end_time" name="end_time" type="datetime-local" required
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500" />
            </div>
          </div>

          <div>
            <label htmlFor="participants" className="block text-sm font-medium text-stone-700">Participants</label>
            <input id="participants" name="participants" type="text"
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder="Alice, Bob (comma-separated)" />
          </div>

          <div>
            <label htmlFor="agenda" className="block text-sm font-medium text-stone-700">Agenda</label>
            <textarea id="agenda" name="agenda" rows={3}
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder="Agenda items..." />
          </div>

          <div>
            <label htmlFor="approval_threshold" className="block text-sm font-medium text-stone-700">
              Approvals needed to pass
            </label>
            <input id="approval_threshold" name="approval_threshold" type="number" min={1} defaultValue={2}
              className="mt-1 block w-32 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500" />
            <p className="mt-1 text-xs text-stone-400">When this many people approve, the event is automatically created.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit"
              className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700">
              Create poll
            </button>
            <Link href={`/planners/${plannerId}/polls`}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
