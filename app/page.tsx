import Link from 'next/link'

// Authenticated users are redirected to /dashboard by proxy.ts
// This page is only shown to unauthenticated visitors
export default function LandingPage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-stone-50 px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Agenda Tracker
        </h1>
        <p className="mt-3 text-base text-stone-500">
          A shared planner for people who still write things down.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
