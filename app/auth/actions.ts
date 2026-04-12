'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/dashboard'

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`)
  }

  redirect(next)
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/dashboard'

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    redirect(`/auth/register?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`)
  }

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      redirect(`/auth/login?error=${encodeURIComponent('Sign-up succeeded, but automatic sign-in failed. Disable email confirmation in Supabase Auth or sign in manually.')}&next=${encodeURIComponent(next)}`)
    }
  }

  redirect(next)
}

export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get('email') as string
  const next = (formData.get('next') as string) || '/dashboard'

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`)
  }

  redirect('/auth/login?success=Check+your+email+for+the+magic+link')
}

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
