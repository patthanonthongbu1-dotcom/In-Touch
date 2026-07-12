import type { VocabEntry } from "@/lib/types";

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </p>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200/70"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/**
 * The word-card sections shared by the reading toolbox and the vocabulary
 * bank, so a word looks the same wherever it appears. The English meaning is
 * the highlighted element; everything else supports it.
 */
export default function VocabCardBody({
  entry,
  expanded,
}: {
  entry: VocabEntry;
  expanded: boolean;
}) {
  return (
    <div className="space-y-3.5">
      <div>
        <Subheading>Meaning</Subheading>
        <p className="mt-1.5 rounded-xl bg-neutral-950 px-3.5 py-2.5 text-[15px] font-medium leading-relaxed text-white">
          {entry.meaning}
        </p>
      </div>

      {entry.thai && (
        <div>
          <Subheading>Thai</Subheading>
          <p className="mt-1 text-sm font-medium leading-relaxed text-neutral-700">{entry.thai}</p>
        </div>
      )}

      {expanded && (
        <>
          <div>
            <Subheading>Example</Subheading>
            <p className="mt-1 border-l-2 border-emerald-400 pl-3 text-sm italic leading-relaxed text-neutral-600">
              &ldquo;{entry.example}&rdquo;
            </p>
          </div>

          {entry.synonyms.length > 0 && (
            <div>
              <Subheading>Synonyms</Subheading>
              <Chips items={entry.synonyms} />
            </div>
          )}

          {entry.collocations.length > 0 && (
            <div>
              <Subheading>Often used with</Subheading>
              <Chips items={entry.collocations} />
            </div>
          )}

          {entry.whyUseful && (
            <div>
              <Subheading>Why learn it</Subheading>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">{entry.whyUseful}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
