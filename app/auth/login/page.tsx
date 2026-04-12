import Link from 'next/link'
import { signIn, signInWithMagicLink } from '@/app/auth/actions'

interface Props {
  searchParams: Promise<{ error?: string; success?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const { error, success, next } = params

  return (
    <div className="min-h-svh flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Agenda Tracker
          </h1>
          <p className="mt-1 text-sm text-stone-500">Sign in to your account</p>
        </div>

        {/* Alerts */}
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

        {/* Email/password form */}
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-8 shadow-sm">
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={next ?? '/dashboard'} />
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
            >
              Sign in
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-xs text-stone-400">or</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          {/* Magic link form */}
          <form action={signInWithMagicLink} className="space-y-4">
            <input type="hidden" name="next" value={next ?? '/dashboard'} />
            <div>
              <label
                htmlFor="magic-email"
                className="block text-sm font-medium text-stone-700"
              >
                Email (magic link)
              </label>
              <input
                id="magic-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
            >
              Send magic link
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          No account?{' '}
          <Link
            href="/auth/register"
            className="font-medium text-stone-900 underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
