import { RRule } from 'rrule'

export type EventRow = {
  id: string
  name: string
  start_time: string
  end_time: string | null
  recurrence_type: string | null
  recurrence_interval: number | null
  recurrence_end_date: string | null
}

export function buildRRule(event: EventRow): string | undefined {
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
