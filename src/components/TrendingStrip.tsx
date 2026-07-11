import { fetchAllTrends, type Trend } from "@/lib/trending";
import { IconFlame } from "@/components/icons";

function hashtag(title: string): string {
  return `#${title.replace(/\s+/g, "")}`;
}

function TrendPill({ trend }: { trend: Trend }) {
  return (
    <a
      href={trend.searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-medium text-neutral-950 ring-1 ring-neutral-200/70 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white"
    >
      <span className="truncate sm:max-w-none">{hashtag(trend.title)}</span>
      {trend.traffic && (
        <span className="text-[10px] font-semibold text-neutral-400 transition-colors group-hover:text-neutral-300">
          {trend.traffic}
        </span>
      )}
    </a>
  );
}

function MarqueeRow({
  label,
  trends,
  reverse = false,
}: {
  label: string;
  trends: Trend[];
  reverse?: boolean;
}) {
  if (trends.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="w-8 shrink-0 text-lg" title={label}>
        {label}
      </span>
      <div className="marquee-mask flex-1">
        <div
          className={`marquee-track ${reverse ? "reverse" : ""}`}
          style={{ "--marquee-duration": `${Math.max(50, trends.length * 9)}s` } as React.CSSProperties}
        >
          {[0, 1].map((dup) => (
            <div key={dup} className="flex gap-2 pr-2" aria-hidden={dup === 1}>
              {trends.map((trend) => (
                <TrendPill key={trend.title} trend={trend} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function TrendingStrip() {
  const { thailand, worldwide } = await fetchAllTrends();
  if (thailand.length === 0 && worldwide.length === 0) return null;

  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-neutral-950">
          <IconFlame size={18} />
          Happening now
        </h2>
        <p className="text-xs text-neutral-400">
          live search trends — tap a tag to see the coverage
        </p>
      </div>

      {/* Desktop: two marquee rows drifting in opposite directions */}
      <div className="hidden sm:block">
        <MarqueeRow label="🇹🇭" trends={thailand} />
        <MarqueeRow label="🌍" trends={worldwide} reverse />
      </div>

      {/* Mobile: compact grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
        {[...thailand.slice(0, 4), ...worldwide.slice(0, 4)].map((trend) => (
          <TrendPill key={trend.title} trend={trend} />
        ))}
      </div>
    </section>
  );
}
