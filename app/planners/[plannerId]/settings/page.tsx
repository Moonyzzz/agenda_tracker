import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { updatePlanner, deletePlanner } from '@/app/planners/actions'
import { DeletePlannerButton } from './delete-button'

interface Props {
  params: Promise<{ plannerId: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function PlannerSettingsPage({ params, searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { plannerId } = await params
  const search = await searchParams
  const error = search.error

  // Check membership
  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Get planner details
  const { data: planner } = await supabase
    .from('planners')
    .select('id, owner_id, name, bg_color, day_color')
    .eq('id', plannerId)
    .single()

  if (!planner) redirect('/dashboard')

  const isOwner = membership.role === 'owner'
  const canEdit = isOwner || membership.role === 'editor'

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            href={`/planners/${plannerId}`}
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            &larr; {planner.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-xl font-semibold text-stone-900">Planner settings</h1>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {canEdit ? (
          <form action={updatePlanner} className="mt-6 space-y-5">
            <input type="hidden" name="planner_id" value={planner.id} />

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-stone-700"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={planner.name}
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>

            <div>
              <label
                htmlFor="bg_color"
                className="block text-sm font-medium text-stone-700"
              >
                Background color
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  id="bg_color"
                  name="bg_color"
                  type="color"
                  defaultValue={planner.bg_color}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-stone-300 p-1"
                />
                <span className="text-xs text-stone-400">Calendar background color</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="day_color"
                className="block text-sm font-medium text-stone-700"
              >
                Day color
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  id="day_color"
                  name="day_color"
                  type="color"
                  defaultValue={planner.day_color}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-stone-300 p-1"
                />
                <span className="text-xs text-stone-400">Day cell color</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Save changes
              </button>
              <Link
                href={`/planners/${plannerId}`}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-stone-700">Name</p>
              <p className="mt-1 text-sm text-stone-900">{planner.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700">Background color</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-sm border border-stone-200"
                  style={{ backgroundColor: planner.bg_color }}
                />
                <span className="text-sm text-stone-600">{planner.bg_color}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700">Day color</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-sm border border-stone-200"
                  style={{ backgroundColor: planner.day_color }}
                />
                <span className="text-sm text-stone-600">{planner.day_color}</span>
              </div>
            </div>
            <p className="text-xs text-stone-400">You are an observer and cannot edit this planner.</p>
          </div>
        )}

        {isOwner && (
          <div className="mt-12 border-t border-stone-200 pt-8">
            <h2 className="text-sm font-semibold text-red-600">Danger zone</h2>
            <p className="mt-1 text-sm text-stone-500">
              Deleting this planner will permanently remove all events, members, and data. This action cannot be undone.
            </p>
            <DeletePlannerButton plannerId={planner.id} plannerName={planner.name} />
          </div>
        )}
      </main>
    </div>
  )
}