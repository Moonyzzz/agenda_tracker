import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { acceptInvite } from '@/app/members/actions'

interface Props {
  params: Promise<{ token: string }>
}

async function getInviteDetails(token: string) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await admin
    .from('planner_invites')
    .select('email, role, expires_at, accepted_at, planners(name)')
    .eq('token', token)
    .single()

  return data
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const invite = await getInviteDetails(token)

  if (!invite) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-900">Invalid invite</h1>
          <p className="mt-2 text-sm text-stone-500">This link is invalid or has expired.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-stone-700 underline">Go home</Link>
        </div>
      </div>
    )
  }

  if (invite.accepted_at) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-900">Already accepted</h1>
          <p className="mt-2 text-sm text-stone-500">This invite has already been used.</p>
          {user && <Link href="/dashboard" className="mt-4 inline-block text-sm text-stone-700 underline">Go to dashboard</Link>}
        </div>
      </div>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-900">Invite expired</h1>
          <p className="mt-2 text-sm text-stone-500">Ask the planner owner to send a new invite.</p>
        </div>
      </div>
    )
  }

  // Not logged in — redirect to register with token as next param
  if (!user) {
    redirect(`/auth/register?next=/invite/${token}`)
  }

  // Auto-accept and redirect
  const result = await acceptInvite(token)

  if (result.error === 'already_used') redirect('/dashboard')
  if (result.plannerId) redirect(`/planners/${result.plannerId}`)

  return (
    <div className="min-h-svh flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-semibold text-stone-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-stone-500">{result.error}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-stone-700 underline">Go to dashboard</Link>
      </div>
    </div>
  )
}
