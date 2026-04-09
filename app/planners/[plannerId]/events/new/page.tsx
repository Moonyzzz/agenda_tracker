import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createEvent } from '@/app/events/actions'
import EventForm from '@/components/EventForm'

interface Props {
  params: Promise<{ plannerId: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function NewEventPage({ params, searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId } = await params
  const { error } = await searchParams

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role === 'observer') redirect(`/planners/${plannerId}`)

  const { data: planner } = await supabase
    .from('planners')
    .select('name')
    .eq('id', plannerId)
    .single()

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href={`/planners/${plannerId}`} className="text-sm text-stone-500 hover:text-stone-900">
            &larr; {planner?.name ?? 'Planner'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-stone-900">New event</h1>
        <EventForm
          plannerId={plannerId}
          action={createEvent}
          submitLabel="Create event"
          cancelHref={`/planners/${plannerId}`}
          error={error}
        />
      </main>
    </div>
  )
}
