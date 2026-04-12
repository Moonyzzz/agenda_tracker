import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { acknowledgeEventAction } from '@/app/events/actions'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { token: eventId } = await params
  const { error } = await searchParams

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/confirm/${eventId}`)

  const { data: event } = await supabase
    .from('events')
    .select('id, name, description, start_time, end_time, planner_id, reminder_email, confirmation_acknowledged')
    .eq('id', eventId)
    .single()

  if (!event) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-stone-500">Event not found or link has expired.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-stone-700 underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Verify user is a member of the planner
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', event.planner_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-stone-500">You don&apos;t have access to this event.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-stone-700 underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const canEdit = membership.role === 'owner' || membership.role === 'editor'
  const startDate = new Date(event.start_time)

  return (
    <div className="min-h-svh bg-stone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
            24h Reminder
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">
            {event.name}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {startDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            {' at '}
            {startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </p>
          {event.end_time && (
            <p className="mt-0.5 text-xs text-stone-400">
              Until {new Date(event.end_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>

        {event.description && (
          <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            {event.description}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {event.confirmation_acknowledged ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
            You&apos;ve already confirmed this event. See you there!
          </div>
        ) : (
          <div className="space-y-3">
            <AcknowledgeForm eventId={event.id} plannerId={event.planner_id} canEdit={canEdit} />
          </div>
        )}
      </div>
    </div>
  )
}

function AcknowledgeForm({
  eventId,
  plannerId,
  canEdit,
}: {
  eventId: string
  plannerId: string
  canEdit: boolean
}) {
  return (
    <>
      <form action={acknowledgeEventAction}>
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="planner_id" value={plannerId} />
        <button
          type="submit"
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
        >
          All good — see you there
        </button>
      </form>
      {canEdit && (
        <Link
          href={`/planners/${plannerId}/events/${eventId}/edit`}
          className="block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
        >
          Make changes
        </Link>
      )}
      <Link
        href={`/planners/${plannerId}`}
        className="block text-center text-xs text-stone-400 hover:text-stone-600"
      >
        View planner
      </Link>
    </>
  )
}
