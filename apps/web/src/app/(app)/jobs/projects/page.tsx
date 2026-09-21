import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import PageHeader, { StatCard } from "@/components/PageHeader";
import NewEngagementForm from "@/components/jobs/NewEngagementForm";
import AttentionList from "@/components/jobs/AttentionList";
import { engagementStatusBadge } from "@/lib/engagementStatus";
import { listEngagementSummaries, type EngagementSummary } from "@/lib/services/engagementService";
import { formatDate, formatMoney, formatRelative } from "@/lib/utils";

const FILTERS = [
  ["ACTIVE", "Active"],
  ["ON_HOLD", "On hold"],
  ["COMPLETE", "Complete"],
  ["ALL", "All"],
] as const;
type Filter = (typeof FILTERS)[number][0];

function sortForPm(a: EngagementSummary, b: EngagementSummary) {
  if (a.redCount !== b.redCount) return b.redCount - a.redCount;
  if (a.orangeCount !== b.orangeCount) return b.orangeCount - a.orangeCount;
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

export default async function EngagementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const role = session.user.role as Role;
  if (role !== "CEO" && role !== "OFFICE") redirect("/dashboard");

  const sp = await searchParams;
  const filter: Filter = FILTERS.some(([v]) => v === sp.status) ? (sp.status as Filter) : "ACTIVE";

  const [all, ungrouped, clients] = await Promise.all([
    listEngagementSummaries(),
    prisma.project.count({ where: { engagementId: null, archivedAt: null } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const counts = { ACTIVE: 0, ON_HOLD: 0, COMPLETE: 0, ALL: all.length } as Record<Filter, number>;
  for (const e of all) if (e.status in counts) counts[e.status as Filter]++;

  const rows = (filter === "ALL" ? all : all.filter((e) => e.status === filter)).sort(sortForPm);
  const active = all.filter((e) => e.status === "ACTIVE");
  const portfolioAttention = active
    .flatMap((e) => e.attention.map((a) => ({ ...a, engagementName: e.name })))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1));
  const activeContract = active.reduce((s, e) => s + e.contractCents + e.approvedChangeCents, 0);
  const activeCost = active.reduce((s, e) => s + e.actualCents, 0);
  const activeOpenJobs = active.reduce((s, e) => s + e.openJobs, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${counts.ACTIVE} active · ${counts.ON_HOLD} on hold · ${counts.COMPLETE} complete · ${ungrouped} ${
          ungrouped === 1 ? "job" : "jobs"
        } awaiting a project`}
        actions={
          ungrouped > 0 ? (
            <Link href="/jobs/list" className="btn-secondary text-xs">
              Triage ungrouped jobs
            </Link>
          ) : undefined
        }
      />
      <div className="px-6 pb-8 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active projects" value={String(counts.ACTIVE)} hint={`${activeOpenJobs} open jobs`} />
          <StatCard label="Committed" value={formatMoney(activeContract)} hint="contract + approved COs, active" />
          <StatCard label="Cost to date" value={formatMoney(activeCost)} hint="active projects" />
          <StatCard
            label="Attention items"
            value={String(portfolioAttention.length)}
            hint={`${portfolioAttention.filter((a) => a.severity === "red").length} red`}
            tone={portfolioAttention.some((a) => a.severity === "red") ? "warn" : "good"}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map(([v, label]) => (
                  <Link
                    key={v}
                    href={v === "ACTIVE" ? "/jobs/projects" : `/jobs/projects?status=${v}`}
                    className={`btn-ghost text-xs ${filter === v ? "!bg-row-bg font-semibold" : ""}`}
                  >
                    {label} <span className="hh-caption ml-1 tabular-nums">{counts[v]}</span>
                  </Link>
                ))}
              </div>
              <NewEngagementForm clients={clients} />
            </div>

            {rows.length === 0 ? (
              <div className="hh-panel p-6">
                <span className="hh-secondary">
                  {all.length === 0
                    ? "No projects yet. Create one, then attach its jobs — e.g. a design job and a construction job under one engagement."
                    : `No ${filter.replace("_", " ").toLowerCase()} projects.`}
                </span>
              </div>
            ) : (
              <div className="hh-panel overflow-x-auto !p-0">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-glass-border">
                    <tr>
                      <th className="hh-label px-5 py-3 text-left">Project</th>
                      <th className="hh-label px-5 py-3 text-left">Status</th>
                      <th className="hh-label px-5 py-3 text-right">Jobs</th>
                      <th className="hh-label px-5 py-3 text-right">Done</th>
                      <th className="hh-label px-5 py-3 text-right">Committed</th>
                      <th className="hh-label px-5 py-3 text-right">Cost</th>
                      <th className="hh-label px-5 py-3 text-left">Next milestone</th>
                      <th className="hh-label px-5 py-3 text-left">Activity</th>
                      <th className="hh-label px-5 py-3 text-right">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {rows.map((e) => {
                      const committed = e.contractCents + e.approvedChangeCents;
                      const over = e.estimateCents > 0 && e.actualCents > e.estimateCents;
                      const nm = e.nextMilestone;
                      const nmOverdue = nm?.dueDate != null && nm.dueDate < today;
                      return (
                        <tr key={e.id} className="hh-row--flat">
                          <td className="px-5 py-3">
                            <Link href={`/jobs/projects/${e.id}`} className="hh-primary hover:underline">
                              {e.name}
                            </Link>
                            <div className="hh-caption">{e.clientName}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={engagementStatusBadge(e.status)}>{e.status.replace("_", " ")}</span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums hh-secondary">
                            <span className="hh-primary">{e.openJobs}</span>
                            <span className="hh-caption">/{e.jobs.length}</span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums hh-secondary">
                            {e.percentComplete == null ? "—" : `${e.percentComplete}%`}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums hh-secondary">{formatMoney(committed)}</td>
                          <td className={`px-5 py-3 text-right tabular-nums ${over ? "text-status-error font-semibold" : "hh-secondary"}`}>
                            {formatMoney(e.actualCents)}
                          </td>
                          <td className="px-5 py-3">
                            {nm ? (
                              <>
                                <div className="hh-secondary truncate max-w-[220px]">{nm.title}</div>
                                <div className={nmOverdue ? "text-status-error text-xs font-semibold" : "hh-caption"}>
                                  {nm.dueDate ? formatDate(nm.dueDate) : "no date"}
                                </div>
                              </>
                            ) : (
                              <span className="hh-caption">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 hh-secondary whitespace-nowrap">
                            {e.lastActivityAt ? formatRelative(e.lastActivityAt) : "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="inline-flex items-center gap-2 justify-end">
                              {e.redCount > 0 && (
                                <span className="inline-flex items-center gap-1 tabular-nums hh-secondary">
                                  <span className="hh-dot hh-dot--red" /> {e.redCount}
                                </span>
                              )}
                              {e.orangeCount > 0 && (
                                <span className="inline-flex items-center gap-1 tabular-nums hh-secondary">
                                  <span className="hh-dot hh-dot--orange" /> {e.orangeCount}
                                </span>
                              )}
                              {e.redCount + e.orangeCount === 0 && <span className="hh-dot hh-dot--green" />}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <AttentionList items={portfolioAttention} showJob limit={12} title="Across active projects" />
          </div>
        </div>
      </div>
    </div>
  );
}
