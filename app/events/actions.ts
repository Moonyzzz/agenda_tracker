'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { parseEventFormData } from '@/lib/events'

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
  const parsed = parseEventFormData(formData)
  if ('error' in parsed) {
    redirect(`/planners/${plannerId}/events/new?error=${encodeURIComponent(parsed.error)}`)
  }

  // Image upload
  const imageFile = formData.get('image') as File | null
  let imageUrl: string | null = null
  if (imageFile && imageFile.size > 0) {
    imageUrl = await uploadImage(supabase, imageFile, plannerId)
    if (!imageUrl) {
      redirect(`/planners/${plannerId}/events/new?error=${encodeURIComponent('Image upload failed')}`)
    }
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      planner_id: plannerId,
      created_by: user.id,
      name: parsed.name,
      description: parsed.description,
      image_url: imageUrl,
      start_time: parsed.startTime,
      end_time: parsed.endTime,
      participants: parsed.participants,
      agenda: parsed.agenda,
      notes: parsed.notes,
      recurrence_type: parsed.recurrenceType,
      recurrence_interval: parsed.recurrenceInterval,
      recurrence_end_date: parsed.recurrenceEndDate,
      reminder_enabled: parsed.reminderEnabled,
      reminder_email: parsed.reminderEmail,
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
  const next = formData.get('next') as string | null
  const parsed = parseEventFormData(formData)
  if ('error' in parsed) {
    redirect(`/planners/${plannerId}/events/${eventId}/edit?error=${encodeURIComponent(parsed.error)}`)
  }

  // Optional new image
  const imageFile = formData.get('image') as File | null
  let imageUrl: string | undefined
  if (imageFile && imageFile.size > 0) {
    imageUrl = (await uploadImage(supabase, imageFile, plannerId)) ?? undefined
    if (!imageUrl) {
      redirect(`/planners/${plannerId}/events/${eventId}/edit?error=${encodeURIComponent('Image upload failed')}`)
    }
  }

  const updates: Record<string, unknown> = {
    name: parsed.name,
    description: parsed.description,
    start_time: parsed.startTime,
    end_time: parsed.endTime,
    participants: parsed.participants,
    agenda: parsed.agenda,
    notes: parsed.notes,
    recurrence_type: parsed.recurrenceType,
    recurrence_interval: parsed.recurrenceInterval,
    recurrence_end_date: parsed.recurrenceEndDate,
    reminder_enabled: parsed.reminderEnabled,
    reminder_email: parsed.reminderEmail,
  }

  if (imageUrl) updates.image_url = imageUrl

  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)

  if (error) {
    redirect(`/planners/${plannerId}/events/${eventId}/edit?error=${encodeURIComponent(error.message)}`)
  }

  redirect(next || `/planners/${plannerId}/events/${eventId}`)
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

export async function acknowledgeEventAction(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const eventId = formData.get('event_id') as string
  const plannerId = formData.get('planner_id') as string
  const next = formData.get('next') as string | null

  const { data: membership } = await supabase
    .from('planner_members')
    .select('id')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard?error=You+do+not+have+access+to+that+event')
  }

  const { error } = await supabase
    .from('events')
    .update({ confirmation_acknowledged: true })
    .eq('id', eventId)
    .eq('planner_id', plannerId)

  if (error) {
    redirect(`/confirm/${eventId}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(next || `/planners/${plannerId}`)
}
