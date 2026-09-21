import Link from "next/link";
import type { AttentionItem } from "@/lib/services/engagementService";

type Item = AttentionItem & { engagementName?: string };

export default function AttentionList({
  items,
  showJob = false,
  limit = 10,
  title = "Needs attention",
}: {
  items: Item[];
  showJob?: boolean;
  limit?: number;
  title?: string;
}) {
  const red = items.filter((a) => a.severity === "red").length;
  const orange = items.length - red;
  const shown = items.slice(0, limit);

  return (
    <section className="hh-panel p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="hh-label">{title}</h2>
        <span className="inline-flex items-center gap-3 hh-secondary tabular-nums">
          {red > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="hh-dot hh-dot--red" /> {red}
            </span>
          )}
          {orange > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="hh-dot hh-dot--orange" /> {orange}
            </span>
          )}
          {items.length === 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="hh-dot hh-dot--green" /> no anomalies
            </span>
          )}
        </span>
      </div>
      {shown.map((a, i) => (
        <Link key={`${a.kind}-${a.jobId}-${i}`} href={a.href} className="hh-row hh-row--flat !items-start gap-3">
          <span className={`hh-dot mt-1.5 shrink-0 ${a.severity === "red" ? "hh-dot--red" : "hh-dot--orange"}`} />
          <span className="min-w-0 flex-1">
            <span className="hh-primary block truncate">{a.title}</span>
            <span className="hh-caption block">
              {[a.engagementName, showJob ? a.jobName : null, a.detail].filter(Boolean).join(" · ")}
            </span>
          </span>
        </Link>
      ))}
      {items.length > shown.length && (
        <span className="hh-caption">+{items.length - shown.length} more on the job pages</span>
      )}
    </section>
  );
}
