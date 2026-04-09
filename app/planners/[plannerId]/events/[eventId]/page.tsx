import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { deleteEvent } from '@/app/events/actions'

interface Props {
  params: Promise<{ plannerId: string; eventId: string }>
  searchParams: Promise<{ error?: string }>
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId, eventId } = await params
  const { error } = await searchParams

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('planner_id', plannerId)
    .single()

  if (!event) redirect(`/planners/${plannerId}`)

  const { data: planner } = await supabase
    .from('planners')
    .select('name')
    .eq('id', plannerId)
    .single()

  const canEdit = membership.role === 'owner' || membership.role === 'editor'

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href={`/planners/${plannerId}`} className="text-sm text-stone-500 hover:text-stone-900">
            &larr; {planner?.name ?? 'Planner'}
          </Link>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/planners/${plannerId}/events/${eventId}/edit`}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                Edit
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.name}
            className="w-full rounded-2xl object-cover max-h-64"
          />
        )}

        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{event.name}</h1>
          {event.description && (
            <p className="mt-2 text-sm text-stone-600">{event.description}</p>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="w-20 shrink-0 font-medium text-stone-500">Start</span>
            <span className="text-stone-900">{formatDateTime(event.start_time)}</span>
          </div>
          {event.end_time && (
            <div className="flex gap-3">
              <span className="w-20 shrink-0 font-medium text-stone-500">End</span>
              <span className="text-stone-900">{formatDateTime(event.end_time)}</span>
            </div>
          )}
          {event.recurrence_type && event.recurrence_type !== 'none' && (
            <div className="flex gap-3">
              <span className="w-20 shrink-0 font-medium text-stone-500">Repeats</span>
              <span className="text-stone-900 capitalize">
                {event.recurrence_type === 'custom'
                  ? `Every ${event.recurrence_interval} days`
                  : event.recurrence_type}
                {event.recurrence_end_date && ` until ${event.recurrence_end_date}`}
              </span>
            </div>
          )}
          {event.participants?.length > 0 && (
            <div className="flex gap-3">
              <span className="w-20 shrink-0 font-medium text-stone-500">People</span>
              <span className="text-stone-900">{event.participants.join(', ')}</span>
            </div>
          )}
          {event.reminder_enabled && event.reminder_email && (
            <div className="flex gap-3">
              <span className="w-20 shrink-0 font-medium text-stone-500">Reminder</span>
              <span className="text-stone-900">{event.reminder_email}</span>
            </div>
          )}
        </div>

        {event.agenda && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-stone-700">Agenda</h2>
            <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-800 whitespace-pre-wrap">
              {event.agenda}
            </div>
          </div>
        )}

        {event.notes && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-stone-700">Notes</h2>
            <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-800 whitespace-pre-wrap">
              {event.notes}
            </div>
          </div>
        )}

        {canEdit && (
          <div className="border-t border-stone-200 pt-6">
            <form action={deleteEvent}>
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="planner_id" value={plannerId} />
              <button
                type="submit"
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                onClick={(e) => {
                  if (!confirm('Delete this event? This cannot be undone.')) e.preventDefault()
                }}
              >
                Delete event
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
