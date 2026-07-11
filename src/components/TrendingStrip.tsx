import { fetchAllTrends, type Trend } from "@/lib/trending";
import { IconFlame } from "@/components/icons";

function hashtag(title: string): string {
  return `#${title.replace(/\s+/g, "")}`;
}

function TrendRow({ label, trends }: { label: string; trends: Trend[] }) {
  if (trends.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="w-8 shrink-0 text-lg" title={label}>
        {label}
      </span>
      <div className="pill-scroll flex flex-1 gap-2 overflow-x-auto pb-1">
        {trends.map((trend) => (
          <a
            key={trend.title}
            href={trend.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-medium text-neutral-950 ring-1 ring-neutral-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white"
          >
            {hashtag(trend.title)}
            {trend.traffic && (
              <span className="text-[10px] font-semibold text-neutral-400 transition-colors group-hover:text-neutral-300">
                {trend.traffic}
              </span>
            )}
          </a>
        ))}
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
      <TrendRow label="🇹🇭" trends={thailand} />
      <TrendRow label="🌍" trends={worldwide} />
    </section>
  );
}
