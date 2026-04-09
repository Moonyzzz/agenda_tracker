'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function createPlanner(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const name = formData.get('name') as string
  const bgColor = formData.get('bg_color') as string
  const dayColor = formData.get('day_color') as string

  if (!name?.trim()) {
    redirect('/planners/new?error=Name+is+required')
  }

  // Insert planner
  const { data: planner, error: plannerError } = await supabase
    .from('planners')
    .insert({
      owner_id: user.id,
      name: name.trim(),
      bg_color: bgColor || '#ffffff',
      day_color: dayColor || '#4f46e5',
    })
    .select('id')
    .single()

  if (plannerError || !planner) {
    redirect(`/planners/new?error=${encodeURIComponent(plannerError?.message || 'Failed to create planner')}`)
  }

  // Add owner as planner_member
  const { error: memberError } = await supabase
    .from('planner_members')
    .insert({
      planner_id: planner.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    redirect(`/planners/new?error=${encodeURIComponent(memberError.message)}`)
  }

  redirect(`/planners/${planner.id}`)
}

export async function updatePlanner(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string
  const name = formData.get('name') as string
  const bgColor = formData.get('bg_color') as string
  const dayColor = formData.get('day_color') as string

  if (!name?.trim()) {
    redirect(`/planners/${plannerId}/settings?error=Name+is+required`)
  }

  const { error } = await supabase
    .from('planners')
    .update({
      name: name.trim(),
      bg_color: bgColor || '#ffffff',
      day_color: dayColor || '#4f46e5',
    })
    .eq('id', plannerId)

  if (error) {
    redirect(`/planners/${plannerId}/settings?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/planners/${plannerId}`)
}

export async function deletePlanner(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const plannerId = formData.get('planner_id') as string

  const { error } = await supabase
    .from('planners')
    .delete()
    .eq('id', plannerId)
    .eq('owner_id', user.id)

  if (error) {
    redirect(`/planners/${plannerId}/settings?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}