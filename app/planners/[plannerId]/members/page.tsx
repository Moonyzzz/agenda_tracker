import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { inviteMember, removeMember } from '@/app/members/actions'

interface Props {
  params: Promise<{ plannerId: string }>
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function MembersPage({ params, searchParams }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { plannerId } = await params
  const { error, success } = await searchParams

  const { data: membership } = await supabase
    .from('planner_members')
    .select('role')
    .eq('planner_id', plannerId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const isOwner = membership.role === 'owner'

  const { data: planner } = await supabase
    .from('planners')
    .select('name')
    .eq('id', plannerId)
    .single()

  // Fetch all members with user emails via auth.users (need service role for emails)
  // We'll just show user_id and role — emails require service role lookup
  const { data: members } = await supabase
    .from('planner_members')
    .select('id, user_id, role, joined_at')
    .eq('planner_id', plannerId)
    .order('joined_at', { ascending: true })

  // Fetch pending invites (owners only)
  const { data: invites } = isOwner
    ? await supabase
        .from('planner_invites')
        .select('id, email, role, created_at, expires_at, accepted_at')
        .eq('planner_id', plannerId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href={`/planners/${plannerId}`} className="text-sm text-stone-500 hover:text-stone-900">
            &larr; {planner?.name ?? 'Planner'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        {/* Members list */}
        <div>
          <h1 className="text-xl font-semibold text-stone-900 mb-4">Members</h1>
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            {(members ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    {m.user_id === user.id ? 'You' : m.user_id.slice(0, 8) + '…'}
                  </p>
                  <p className="text-xs text-stone-500 capitalize">{m.role}</p>
                </div>
                {isOwner && m.user_id !== user.id && (
                  <form action={removeMember}>
                    <input type="hidden" name="planner_id" value={plannerId} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      onClick={(e) => {
                        if (!confirm('Remove this member?')) e.preventDefault()
                      }}
                    >
                      Remove
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending invites */}
        {isOwner && invites && invites.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-stone-700 mb-3">Pending invites</h2>
            <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-stone-900">{inv.email}</p>
                    <p className="text-xs text-stone-500 capitalize">{inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite form */}
        {isOwner && (
          <div>
            <h2 className="text-sm font-semibold text-stone-700 mb-3">Invite someone</h2>
            <form action={inviteMember} className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
              <input type="hidden" name="planner_id" value={plannerId} />
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  placeholder="friend@example.com"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-stone-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                >
                  <option value="editor">Editor — can create and edit events</option>
                  <option value="observer">Observer — can view only</option>
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Send invite
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
