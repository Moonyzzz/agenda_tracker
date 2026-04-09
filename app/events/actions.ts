'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

function parseParticipants(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  file: File,
  plannerId: string
): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${plannerId}/${crypto.randomUUID()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('events')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return null

  const { data } = supabase.storage.from('events').getPublicUrl(path)
  return data.publicUrl
}

export async function createEvent(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string
  const name = (formData.get('name') as string)?.trim()

  if (!name) redirect(`/planners/${plannerId}/events/new?error=Name+is+required`)

  // Image upload
  const imageFile = formData.get('image') as File | null
  let imageUrl: string | null = null
  if (imageFile && imageFile.size > 0) {
    imageUrl = await uploadImage(supabase, imageFile, plannerId)
  }

  const reminderEnabled = formData.get('reminder_enabled') === 'on'

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      planner_id: plannerId,
      created_by: user.id,
      name,
      description: (formData.get('description') as string) || null,
      image_url: imageUrl,
      start_time: formData.get('start_time') as string,
      end_time: (formData.get('end_time') as string) || null,
      participants: parseParticipants(formData.get('participants') as string ?? ''),
      agenda: (formData.get('agenda') as string) || null,
      notes: (formData.get('notes') as string) || null,
      recurrence_type: (formData.get('recurrence_type') as string) || 'none',
      recurrence_interval: formData.get('recurrence_interval')
        ? Number(formData.get('recurrence_interval'))
        : null,
      recurrence_end_date: (formData.get('recurrence_end_date') as string) || null,
      reminder_enabled: reminderEnabled,
      reminder_email: reminderEnabled ? (formData.get('reminder_email') as string) || null : null,
    })
    .select('id')
    .single()

  if (error || !event) {
    redirect(`/planners/${plannerId}/events/new?error=${encodeURIComponent(error?.message ?? 'Failed to create event')}`)
  }

  redirect(`/planners/${plannerId}/events/${event.id}`)
}

export async function updateEvent(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const eventId = formData.get('event_id') as string
  const plannerId = formData.get('planner_id') as string
  const name = (formData.get('name') as string)?.trim()

  if (!name) redirect(`/planners/${plannerId}/events/${eventId}/edit?error=Name+is+required`)

  // Optional new image
  const imageFile = formData.get('image') as File | null
  let imageUrl: string | undefined
  if (imageFile && imageFile.size > 0) {
    imageUrl = (await uploadImage(supabase, imageFile, plannerId)) ?? undefined
  }

  const reminderEnabled = formData.get('reminder_enabled') === 'on'

  const updates: Record<string, unknown> = {
    name,
    description: (formData.get('description') as string) || null,
    start_time: formData.get('start_time') as string,
    end_time: (formData.get('end_time') as string) || null,
    participants: parseParticipants(formData.get('participants') as string ?? ''),
    agenda: (formData.get('agenda') as string) || null,
    notes: (formData.get('notes') as string) || null,
    recurrence_type: (formData.get('recurrence_type') as string) || 'none',
    recurrence_interval: formData.get('recurrence_interval')
      ? Number(formData.get('recurrence_interval'))
      : null,
    recurrence_end_date: (formData.get('recurrence_end_date') as string) || null,
    reminder_enabled: reminderEnabled,
    reminder_email: reminderEnabled ? (formData.get('reminder_email') as string) || null : null,
  }

  if (imageUrl) updates.image_url = imageUrl

  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)

  if (error) {
    redirect(`/planners/${plannerId}/events/${eventId}/edit?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/planners/${plannerId}/events/${eventId}`)
}

export async function deleteEvent(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const eventId = formData.get('event_id') as string
  const plannerId = formData.get('planner_id') as string

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    redirect(`/planners/${plannerId}/events/${eventId}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/planners/${plannerId}`)
}
