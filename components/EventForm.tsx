'use client'

import { useState } from 'react'

export type EventDefaults = {
  name?: string
  description?: string
  image_url?: string
  start_time?: string
  end_time?: string
  participants?: string[]
  agenda?: string
  notes?: string
  recurrence_type?: string
  recurrence_interval?: number | null
  recurrence_end_date?: string | null
  reminder_enabled?: boolean
  reminder_email?: string | null
}

interface Props {
  plannerId: string
  eventId?: string
  defaults?: EventDefaults
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  cancelHref: string
  error?: string
}

function toDatetimeLocal(iso?: string): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export default function EventForm({
  plannerId,
  eventId,
  defaults = {},
  action,
  submitLabel,
  cancelHref,
  error,
}: Props) {
  const [recurrenceType, setRecurrenceType] = useState(defaults.recurrence_type ?? 'none')
  const [reminderEnabled, setReminderEnabled] = useState(defaults.reminder_enabled ?? false)
  const [imagePreview, setImagePreview] = useState<string | null>(defaults.image_url ?? null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImagePreview(URL.createObjectURL(file))
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="planner_id" value={plannerId} />
      {eventId && <input type="hidden" name="event_id" value={eventId} />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaults.name}
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          placeholder="Event name"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults.description}
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          placeholder="What's this event about?"
        />
      </div>

      {/* Start / End */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-stone-700">
            Start <span className="text-red-500">*</span>
          </label>
          <input
            id="start_time"
            name="start_time"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(defaults.start_time)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>
        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-stone-700">
            End
          </label>
          <input
            id="end_time"
            name="end_time"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaults.end_time ?? undefined)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>
      </div>

      {/* Participants */}
      <div>
        <label htmlFor="participants" className="block text-sm font-medium text-stone-700">
          Participants
        </label>
        <input
          id="participants"
          name="participants"
          type="text"
          defaultValue={defaults.participants?.join(', ')}
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          placeholder="Alice, Bob, charlie@example.com"
        />
        <p className="mt-1 text-xs text-stone-400">Comma-separated names or emails</p>
      </div>

      {/* Agenda */}
      <div>
        <label htmlFor="agenda" className="block text-sm font-medium text-stone-700">
          Agenda
        </label>
        <textarea
          id="agenda"
          name="agenda"
          rows={4}
          defaultValue={defaults.agenda ?? undefined}
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          placeholder="Agenda items..."
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-stone-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults.notes ?? undefined}
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          placeholder="Additional notes..."
        />
      </div>

      {/* Image */}
      <div>
        <label htmlFor="image" className="block text-sm font-medium text-stone-700">
          Image
        </label>
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Preview"
            className="mt-2 mb-2 h-32 w-full rounded-lg object-cover"
          />
        )}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-stone-200"
        />
      </div>

      {/* Recurrence */}
      <div className="space-y-3">
        <div>
          <label htmlFor="recurrence_type" className="block text-sm font-medium text-stone-700">
            Recurrence
          </label>
          <select
            id="recurrence_type"
            name="recurrence_type"
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Every N days</option>
          </select>
        </div>

        {recurrenceType !== 'none' && (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2">
            {recurrenceType === 'custom' && (
              <div>
                <label htmlFor="recurrence_interval" className="block text-sm font-medium text-stone-700">
                  Repeat every (days)
                </label>
                <input
                  id="recurrence_interval"
                  name="recurrence_interval"
                  type="number"
                  min={1}
                  defaultValue={defaults.recurrence_interval ?? 1}
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
            )}
            <div>
              <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-stone-700">
                End date (optional)
              </label>
              <input
                id="recurrence_end_date"
                name="recurrence_end_date"
                type="date"
                defaultValue={defaults.recurrence_end_date ?? undefined}
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Reminder */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            id="reminder_enabled"
            name="reminder_enabled"
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
          />
          <label htmlFor="reminder_enabled" className="text-sm font-medium text-stone-700">
            Send reminder email
          </label>
        </div>

        {reminderEnabled && (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <label htmlFor="reminder_email" className="block text-sm font-medium text-stone-700">
              Reminder email
            </label>
            <input
              id="reminder_email"
              name="reminder_email"
              type="email"
              defaultValue={defaults.reminder_email ?? undefined}
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder="you@example.com"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
        >
          {submitLabel}
        </button>
        <a
          href={cancelHref}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
