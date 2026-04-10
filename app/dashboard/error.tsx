'use client'

import { useEffect } from 'react'

export default function DashboardError({
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
        <h2 className="text-lg font-semibold text-stone-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-stone-500">
          Failed to load your dashboard. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
