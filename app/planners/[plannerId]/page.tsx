import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import CalendarView, { type CalendarEvent } from '@/components/CalendarView'
import { RRule } from 'rrule'

interface Props {
  params: Promise<{ plannerId: string }>
}

type EventRow = {
  id: string
  name: string
  start_time: string
  end_time: string | null
  recurrence_type: string | null
  recurrence_interval: number | null
  recurrence_end_date: string | null
}

function buildRRule(event: EventRow): string | undefined {
  const { recurrence_type, recurrence_interval, recurrence_end_date } = event
  if (!recurrence_type || recurrence_type === 'none') return undefined

  const freqMap: Record<string, number> = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
    custom: RRule.DAILY,
  }

  const freq = freqMap[recurrence_type]
  if (freq === undefined) return undefined

  const options: ConstructorParameters<typeof RRule>[0] = {
    freq,
    interval: recurrence_interval ?? 1,
    dtstart: new Date(event.start_time),
  }

  if (recurrence_end_date) {
    options.until = new Date(recurrence_end_date)
  }

  return new RRule(options).toString()
}

export default async function PlannerPage({ params }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId } = await params

  // Verify membership
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Fetch planner
  const { data: planner } = await supabase
    .from('planners')
    .select('id, name, bg_color, day_color, owner_id')
    .eq('id', plannerId)
    .single()

  if (!planner) redirect('/dashboard')

  // Fetch events
  const { data: events } = await supabase
    .from('events')
    .select('id, name, start_time, end_time, recurrence_type, recurrence_interval, recurrence_end_date')
    .eq('planner_id', plannerId)
    .order('start_time', { ascending: true })

  const calendarEvents: CalendarEvent[] = (events ?? []).map((e: EventRow) => {
    const rrule = buildRRule(e)
    const durationMs = e.end_time
      ? new Date(e.end_time).getTime() - new Date(e.start_time).getTime()
      : 3600000

    const base: CalendarEvent = {
      id: e.id,
      title: e.name,
      start: e.start_time,
    }

    if (rrule) {
      base.rrule = rrule
      base.duration = `${Math.floor(durationMs / 60000)}m`
    } else {
      base.end = e.end_time ?? undefined
    }

    return base
  })

  const canEdit = membership.role === 'owner' || membership.role === 'editor'

  return (
    <div className="min-h-svh" style={{ backgroundColor: planner.bg_color }}>
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-900">
              &larr; Dashboard
            </Link>
            <span className="text-stone-300">/</span>
            <h1 className="text-sm font-semibold text-stone-900">{planner.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link
                href={`/planners/${plannerId}/events/new`}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                + Event
              </Link>
            )}
            <Link
              href={`/planners/${plannerId}/polls`}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Polls
            </Link>
            <Link
              href={`/planners/${plannerId}/settings`}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      {/* Calendar */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <CalendarView
            plannerId={plannerId}
            events={calendarEvents}
            dayColor={planner.day_color}
            bgColor={planner.bg_color}
          />
        </div>
      </main>
    </div>
  )
}
