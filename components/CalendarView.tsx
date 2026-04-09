'use client'

import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import rrulePlugin from '@fullcalendar/rrule'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor?: string
  rrule?: string
  duration?: string
}

interface Props {
  plannerId: string
  events: CalendarEvent[]
  dayColor: string
  bgColor: string
}

export default function CalendarView({ plannerId, events, dayColor, bgColor }: Props) {
  const router = useRouter()

  return (
    <div className="fc-wrapper" style={{ '--fc-today-bg-color': dayColor + '33' } as React.CSSProperties}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, rrulePlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek',
        }}
        views={{
          dayGridMonth: { buttonText: 'Month' },
          timeGridWeek: { buttonText: 'Week' },
          listWeek: { buttonText: 'List' },
        }}
        events={events}
        eventClick={(info) => {
          info.jsEvent.preventDefault()
          router.push(`/planners/${plannerId}/events/${info.event.id}`)
        }}
        eventColor={dayColor}
        height="auto"
        dayMaxEvents={3}
        nowIndicator
        windowResizeDelay={50}
      />
    </div>
  )
}
