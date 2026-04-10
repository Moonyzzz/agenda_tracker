export default function DashboardLoading() {
  return (
    <div className="min-h-svh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-stone-200" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-stone-200" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-6 w-36 animate-pulse rounded bg-stone-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-stone-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded-sm bg-stone-200" />
                <div className="h-4 w-4 animate-pulse rounded-sm bg-stone-200" />
              </div>
              <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
