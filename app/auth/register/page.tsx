import Link from 'next/link'
import { signUp } from '@/app/auth/actions'

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams
  const { error, success } = params

  return (
    <div className="min-h-svh flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Agenda Tracker
          </h1>
          <p className="mt-1 text-sm text-stone-500">Create your account</p>
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

        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-8 shadow-sm">
          <form action={signUp} className="space-y-4">
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
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="Min. 8 characters"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
            >
              Create account
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-stone-900 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
