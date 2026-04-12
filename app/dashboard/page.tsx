import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import { acceptInviteAction, declineInviteAction } from '@/app/members/actions'

type Planner = {
  id: string
  owner_id: string
  name: string
  bg_color: string
  day_color: string
  created_at: string
  member_count: number
}

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error, success } = await searchParams

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

  const { data: invites } = user.email
    ? await supabase
        .from('planner_invites')
        .select('id, planner_id, email, role, expires_at, planners(name)')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    : { data: [] }

  const now = new Date()
  const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString()
  const { data: confirmationEvents } = memberships && memberships.length > 0
    ? await supabase
        .from('events')
        .select('id, planner_id, name, start_time, confirmation_acknowledged')
        .in('planner_id', memberships.map((m) => m.planner_id))
        .eq('confirmation_acknowledged', false)
        .gte('start_time', now.toISOString())
        .lte('start_time', in26h)
        .order('start_time', { ascending: true })
    : { data: [] }

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
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-900">Your planners</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/calendar"
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Combined calendar
            </Link>
            <Link
              href="/planners/new"
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              New planner
            </Link>
          </div>
        </div>

        {invites && invites.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold text-amber-900">Pending invites</h2>
            <div className="mt-3 space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {(invite.planners as { name?: string } | null)?.name ?? 'Planner'}
                    </p>
                    <p className="text-xs text-stone-500 capitalize">
                      {invite.role} access · expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={acceptInviteAction}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <button type="submit" className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700">
                        Accept
                      </button>
                    </form>
                    <form action={declineInviteAction}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <button type="submit" className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {confirmationEvents && confirmationEvents.length > 0 && (
          <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-900">Upcoming event confirmations</h2>
            <div className="mt-3 space-y-3">
              {confirmationEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{event.name}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(event.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <Link
                    href={`/confirm/${event.id}`}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

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
