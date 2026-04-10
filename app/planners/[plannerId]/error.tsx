'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function PlannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-svh bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-lg font-semibold text-stone-900">Failed to load planner</h2>
        <p className="mt-2 text-sm text-stone-500">
          Something went wrong. Your data is safe.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
