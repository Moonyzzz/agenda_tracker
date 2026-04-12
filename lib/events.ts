type EventFormValues = {
  name: string
  description: string | null
  startTime: string
  endTime: string
  participants: string[]
  agenda: string | null
  notes: string | null
  recurrenceType: string
  recurrenceInterval: number | null
  recurrenceEndDate: string | null
  reminderEnabled: boolean
  reminderEmail: string | null
}

export function parseParticipants(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function normalizeDateTime(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

export function parseEventFormData(formData: FormData): EventFormValues | { error: string } {
  const name = typeof formData.get('name') === 'string' ? (formData.get('name') as string).trim() : ''
  const startTime = normalizeDateTime(formData.get('start_time'))
  const endTime = normalizeDateTime(formData.get('end_time'))
  const recurrenceType = typeof formData.get('recurrence_type') === 'string'
    ? (formData.get('recurrence_type') as string)
    : 'none'
  const reminderEnabled = formData.get('reminder_enabled') === 'on'
  const reminderEmail = reminderEnabled ? normalizeOptionalText(formData.get('reminder_email')) : null

  if (!name) {
    return { error: 'Name is required' }
  }

  if (!startTime) {
    return { error: 'Start time is required' }
  }

  if (!endTime) {
    return { error: 'End time is required' }
  }

  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Start and end time must be valid dates' }
  }

  if (end <= start) {
    return { error: 'End time must be after the start time' }
  }

  if (reminderEnabled && !reminderEmail) {
    return { error: 'Reminder email is required when reminders are enabled' }
  }

  const recurrenceInterval = recurrenceType === 'custom' && formData.get('recurrence_interval')
    ? Number(formData.get('recurrence_interval'))
    : null

  if (recurrenceType === 'custom' && (!recurrenceInterval || recurrenceInterval < 1)) {
    return { error: 'Custom recurrence interval must be at least 1 day' }
  }

  return {
    name,
    description: normalizeOptionalText(formData.get('description')),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    participants: parseParticipants(typeof formData.get('participants') === 'string' ? formData.get('participants') as string : ''),
    agenda: normalizeOptionalText(formData.get('agenda')),
    notes: normalizeOptionalText(formData.get('notes')),
    recurrenceType,
    recurrenceInterval,
    recurrenceEndDate: normalizeOptionalText(formData.get('recurrence_end_date')),
    reminderEnabled,
    reminderEmail,
  }
}
