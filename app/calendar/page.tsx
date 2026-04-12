import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import CalendarWrapper from '@/components/CalendarWrapper'
import type { CalendarEvent } from '@/components/CalendarView'
import { buildRRule, type EventRow } from '@/lib/recurrence'

interface Props {
  searchParams: Promise<{ planners?: string | string[] }>
}

type PlannerRow = {
  id: string
  name: string
  bg_color: string
  day_color: string
}

type EventWithPlanner = EventRow & {
  planner_id: string
}

function findOverlappingEventIds(events: EventWithPlanner[]): Set<string> {
  const sorted = [...events]
    .filter((event) => event.end_time)
    .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())

  const overlaps = new Set<string>()
  for (let index = 0; index < sorted.length; index++) {
    const current = sorted[index]
    const currentEnd = new Date(current.end_time ?? current.start_time).getTime()

    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex++) {
      const candidate = sorted[nextIndex]
      const candidateStart = new Date(candidate.start_time).getTime()
      if (candidateStart >= currentEnd) break

      if (current.planner_id !== candidate.planner_id) {
        overlaps.add(current.id)
        overlaps.add(candidate.id)
      }
    }
  }

  return overlaps
}

export default async function CombinedCalendarPage({ searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: memberships } = await supabase
    .from('planner_members')
    .select('planner_id')
    .eq('user_id', user.id)

  const plannerIds = memberships?.map((membership) => membership.planner_id) ?? []
  if (plannerIds.length === 0) redirect('/dashboard')

  const params = await searchParams
  const selectedParam = Array.isArray(params.planners)
    ? params.planners
    : params.planners
      ? params.planners.split(',')
      : []
  const selectedIds = selectedParam.length > 0
    ? selectedParam.map((value) => value.trim()).filter((value) => plannerIds.includes(value))
    : plannerIds

  const { data: planners } = await supabase
    .from('planners')
    .select('id, name, bg_color, day_color')
    .in('id', plannerIds)
    .order('created_at', { ascending: false })

  const selectedPlannerIds = selectedIds.length > 0 ? selectedIds : plannerIds
  const returnTo = `/calendar?${selectedPlannerIds.map((id) => `planners=${encodeURIComponent(id)}`).join('&')}`
  const { data: events } = await supabase
    .from('events')
    .select('id, planner_id, name, start_time, end_time, recurrence_type, recurrence_interval, recurrence_end_date')
    .in('planner_id', selectedPlannerIds)
    .order('start_time', { ascending: true })

  const plannerMap = new Map<string, PlannerRow>((planners ?? []).map((planner) => [planner.id, planner]))
  const overlapIds = findOverlappingEventIds((events ?? []) as EventWithPlanner[])

  const calendarEvents: CalendarEvent[] = ((events ?? []) as EventWithPlanner[]).map((event) => {
    const planner = plannerMap.get(event.planner_id)
    const rrule = buildRRule(event)
    const durationMs = event.end_time
      ? new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
      : 3600000

    const base: CalendarEvent = {
      id: event.id,
      plannerId: event.planner_id,
      returnTo,
      title: planner ? `${planner.name}: ${event.name}` : event.name,
      start: event.start_time,
      backgroundColor: planner?.day_color,
      borderColor: planner?.day_color,
      classNames: overlapIds.has(event.id) ? ['event-overlap'] : [],
    }

    if (rrule) {
      base.rrule = rrule
      base.duration = `${Math.floor(durationMs / 60000)}m`
    } else {
      base.end = event.end_time ?? undefined
    }

    return base
  })

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-900">
              &larr; Dashboard
            </Link>
            <span className="text-stone-300">/</span>
            <h1 className="text-sm font-semibold text-stone-900">Combined calendar</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <form className="space-y-4" method="get">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Visible planners</h2>
                <p className="text-xs text-stone-500">Select the planners to compare in one calendar.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                >
                  Apply
                </button>
                <Link
                  href="/calendar"
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Select all
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(planners ?? []).map((planner) => (
                <label key={planner.id} className="flex items-start gap-3 rounded-xl border border-stone-200 px-3 py-3">
                  <input
                    type="checkbox"
                    name="planners"
                    value={planner.id}
                    defaultChecked={selectedPlannerIds.includes(planner.id)}
                    className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-stone-900">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: planner.day_color }}
                      />
                      {planner.name}
                    </span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {selectedPlannerIds.includes(planner.id) ? 'Included in overlap check' : 'Hidden'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </form>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
            Dashed outline = overlaps another selected planner
          </span>
          <span>{calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''} loaded</span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <CalendarWrapper
            events={calendarEvents}
            dayColor="#1c1917"
            bgColor="#ffffff"
          />
        </div>
      </main>
    </div>
  )
}
