import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createPlanner } from '@/app/planners/actions'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NewPlannerPage({ searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const params = await searchParams
  const error = params.error

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            &larr; Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-xl font-semibold text-stone-900">New planner</h1>
        <p className="mt-1 text-sm text-stone-500">
          Create a new planner to organize your events and schedule.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={createPlanner} className="mt-6 space-y-5">
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
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder="e.g. Work Schedule"
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
                defaultValue="#ffffff"
                className="h-10 w-14 cursor-pointer rounded-lg border border-stone-300 p-1"
              />
              <span className="text-xs text-stone-400">Pick a color for the calendar background</span>
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
                defaultValue="#4f46e5"
                className="h-10 w-14 cursor-pointer rounded-lg border border-stone-300 p-1"
              />
              <span className="text-xs text-stone-400">Pick a color for the day cells</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Create planner
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}