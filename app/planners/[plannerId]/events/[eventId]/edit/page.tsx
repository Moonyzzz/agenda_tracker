import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { updateEvent } from '@/app/events/actions'
import EventForm from '@/components/EventForm'

interface Props {
  params: Promise<{ plannerId: string; eventId: string }>
  searchParams: Promise<{ error?: string; next?: string }>
}

export default async function EditEventPage({ params, searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId, eventId } = await params
  const { error, next } = await searchParams

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role === 'observer') redirect(`/planners/${plannerId}`)

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

  const cancelHref = next ?? `/planners/${plannerId}/events/${eventId}`

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href={cancelHref}
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            &larr; {planner?.name ?? 'Planner'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-stone-900">Edit event</h1>
        <EventForm
          plannerId={plannerId}
          eventId={eventId}
          defaults={{
            name: event.name,
            description: event.description,
            image_url: event.image_url,
            start_time: event.start_time,
            end_time: event.end_time,
            participants: event.participants,
            agenda: event.agenda,
            notes: event.notes,
            recurrence_type: event.recurrence_type,
            recurrence_interval: event.recurrence_interval,
            recurrence_end_date: event.recurrence_end_date,
            reminder_enabled: event.reminder_enabled,
            reminder_email: event.reminder_email,
          }}
          action={updateEvent}
          submitLabel="Save changes"
          cancelHref={cancelHref}
          error={error}
          next={next}
        />
      </main>
    </div>
  )
}
