/**
 * Global loading skeleton shown while server components (PopularThisWeek,
 * TrendingTopics, MostRead, etc.) are fetching data.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      {/* Header skeleton */}
      <div className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
        <div className="h-8 animate-pulse bg-stone-100 dark:bg-stone-900" />
        <div className="mx-auto max-w-[1400px] px-4 py-3">
          <div className="mx-auto h-12 w-64 animate-pulse rounded bg-stone-100 dark:bg-stone-900" />
        </div>
        <div className="h-10 animate-pulse bg-stone-100 dark:bg-stone-900" />
      </div>

      {/* Content skeleton */}
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-8">
          {/* Hero area */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="aspect-[16/9] w-full animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
              <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-stone-100 dark:bg-stone-900" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-stone-100 dark:bg-stone-900" />
            </div>
            <div className="lg:col-span-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 border-b border-stone-200 py-3 dark:border-stone-800">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-stone-100 dark:bg-stone-900" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100 dark:bg-stone-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section skeletons */}
          {[1, 2, 3].map((s) => (
            <div key={s} className="mt-10">
              <div className="mb-6 h-8 w-48 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((c) => (
                  <div key={c}>
                    <div className="aspect-[16/10] w-full animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-stone-100 dark:bg-stone-900" />
                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-stone-100 dark:bg-stone-900" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer skeleton */}
      <div className="mt-auto h-32 animate-pulse bg-stone-100 dark:bg-stone-900" />
    </div>
  );
}
