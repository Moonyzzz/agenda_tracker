import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'

type Planner = {
  id: string
  owner_id: string
  name: string
  bg_color: string
  day_color: string
  created_at: string
  member_count: number
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Fetch planners where user is a member
  const { data: memberships } = await supabase
    .from('planner_members')
    .select('planner_id')
    .eq('user_id', user.id)

  let planners: Planner[] = []

  if (memberships && memberships.length > 0) {
    const plannerIds = memberships.map((m) => m.planner_id)

    const { data: plannerRows } = await supabase
      .from('planners')
      .select('id, owner_id, name, bg_color, day_color, created_at')
      .in('id', plannerIds)
      .order('created_at', { ascending: false })

    // Get member counts
    const { data: memberRows } = await supabase
      .from('planner_members')
      .select('planner_id')
      .in('planner_id', plannerIds)

    const countMap = new Map<string, number>()
    for (const m of memberRows ?? []) {
      countMap.set(m.planner_id, (countMap.get(m.planner_id) ?? 0) + 1)
    }

    planners = (plannerRows ?? []).map((p) => ({
      ...p,
      member_count: countMap.get(p.id) ?? 0,
    }))
  }

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold text-stone-900">Agenda Tracker</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-900">Your planners</h2>
          <Link
            href="/planners/new"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            New planner
          </Link>
        </div>

        {planners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
            <p className="text-sm text-stone-400">
              No planners yet. Create one to get started.
            </p>
            <Link
              href="/planners/new"
              className="mt-4 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Create your first planner
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planners.map((planner) => (
              <Link
                key={planner.id}
                href={`/planners/${planner.id}`}
                className="group rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-sm border border-stone-200"
                    style={{ backgroundColor: planner.bg_color }}
                  />
                  <span
                    className="inline-block h-4 w-4 rounded-sm"
                    style={{ backgroundColor: planner.day_color }}
                  />
                </div>
                <h3 className="font-medium text-stone-900 group-hover:underline">
                  {planner.name}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {planner.member_count} member{planner.member_count !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}