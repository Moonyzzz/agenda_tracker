'use client'

import dynamic from 'next/dynamic'
import type { CalendarEvent } from './CalendarView'

// FullCalendar accesses browser globals (window, document) during render.
// Using ssr: false prevents it from running on the server, which would
// otherwise throw in production and trigger the [plannerId] error boundary.
const CalendarView = dynamic(() => import('./CalendarView'), {
  ssr: false,
  loading: () => (
    <div className="h-96 animate-pulse rounded-xl bg-stone-100" />
  ),
})

interface Props {
  plannerId?: string
  events: CalendarEvent[]
  dayColor: string
  bgColor: string
}

export default function CalendarWrapper(props: Props) {
  return <CalendarView {...props} />
}
