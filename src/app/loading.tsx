function Bar({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-full ${className}`} />;
}

function CardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={`glass overflow-hidden rounded-3xl ${featured ? "sm:col-span-2" : ""}`}>
      <div className={`shimmer ${featured ? "h-52 sm:h-72" : "h-40"}`} />
      <div className="space-y-3 p-6">
        <div className="flex gap-2">
          <Bar className="h-6 w-24" />
          <Bar className="h-6 w-12" />
        </div>
        <Bar className="h-5 w-4/5" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div>
      {/* Hero skeleton */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-14 pt-16 sm:pb-20 sm:pt-28">
        <Bar className="h-9 w-64" />
        <Bar className="mt-8 h-12 w-3/4 max-w-xl sm:h-16" />
        <Bar className="mt-4 h-12 w-2/3 max-w-lg sm:h-16" />
        <Bar className="mt-6 h-4 w-80 max-w-full" />
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Bar className="h-11 w-40" />
          <Bar className="h-11 w-44" />
          <Bar className="h-11 w-40" />
        </div>
      </section>

      {/* Trending skeleton */}
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <Bar className="h-6 w-44" />
          <div className="mt-4 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <Bar key={i} className="h-8 w-28 shrink-0" />
            ))}
          </div>
        </div>
      </section>

      {/* Category pills + cards skeleton */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Bar key={i} className="h-9 w-32 shrink-0" />
          ))}
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <CardSkeleton featured />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    </div>
  );
}
