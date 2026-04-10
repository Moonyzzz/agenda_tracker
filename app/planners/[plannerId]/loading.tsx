export default function PlannerLoading() {
  return (
    <div className="min-h-svh bg-stone-100">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-20 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-px bg-stone-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded-lg bg-stone-200" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-stone-200" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          {/* Calendar skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 animate-pulse rounded bg-stone-200" />
              <div className="flex gap-2">
                <div className="h-8 w-8 animate-pulse rounded bg-stone-200" />
                <div className="h-8 w-8 animate-pulse rounded bg-stone-200" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded bg-stone-100"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
