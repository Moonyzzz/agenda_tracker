import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMember, removeMember, changeRole, revokeInviteAction } from '@/app/members/actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'

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

  const { data: members } = await supabase
    .from('planner_members')
    .select('id, user_id, role, joined_at')
    .eq('planner_id', plannerId)
    .order('joined_at', { ascending: true })

  const admin = createAdminClient()
  const emailMap = new Map<string, string>()
  for (const member of members ?? []) {
    const { data: { user: authUser } } = await admin.auth.admin.getUserById(member.user_id)
    if (authUser?.email) emailMap.set(authUser.id, authUser.email)
  }

  const { data: invites } = isOwner
    ? await supabase
        .from('planner_invites')
        .select('id, email, role, created_at, expires_at, status')
        .eq('planner_id', plannerId)
        .eq('status', 'pending')
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

        <div>
          <h1 className="mb-4 text-xl font-semibold text-stone-900">Members</h1>
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {(members ?? []).map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    {emailMap.get(member.user_id) ?? `${member.user_id.slice(0, 8)}...`}
                    {member.user_id === user.id && (
                      <span className="ml-2 text-xs font-normal text-stone-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs capitalize text-stone-500">{member.role}</p>
                </div>
                {isOwner && member.user_id !== user.id && member.role !== 'owner' && (
                  <div className="flex items-center gap-3">
                    <form action={changeRole} className="flex items-center gap-1.5">
                      <input type="hidden" name="planner_id" value={plannerId} />
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        className="rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
                      >
                        <option value="editor">Editor</option>
                        <option value="observer">Observer</option>
                      </select>
                      <button
                        type="submit"
                        className="text-xs text-stone-500 transition-colors hover:text-stone-800"
                      >
                        Save
                      </button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="planner_id" value={plannerId} />
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <ConfirmSubmitButton
                        confirmMessage="Remove this member?"
                        className="text-xs text-red-500 transition-colors hover:text-red-700"
                      >
                        Remove
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {isOwner && invites && invites.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-stone-700">Pending invites</h2>
            <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-stone-900">{invite.email}</p>
                    <p className="text-xs capitalize text-stone-500">
                      {invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="planner_id" value={plannerId} />
                    <input type="hidden" name="invite_id" value={invite.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-500 transition-colors hover:text-red-700"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-stone-700">Invite someone</h2>
            <form action={inviteMember} className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
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
                  <option value="editor">Editor - can create and edit events</option>
                  <option value="observer">Observer - can view only</option>
                </select>
              </div>
              <p className="text-xs text-stone-400">
                Invites appear on the recipient&apos;s dashboard after they sign in with this email.
              </p>
              <button
                type="submit"
                className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Create invite
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
