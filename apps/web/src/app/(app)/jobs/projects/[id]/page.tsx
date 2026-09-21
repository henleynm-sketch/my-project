import Link from "next/link";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import { StatCard } from "@/components/PageHeader";
import EngagementHeader from "@/components/jobs/EngagementHeader";
import EngagementJobs from "@/components/jobs/EngagementJobs";
import AttentionList from "@/components/jobs/AttentionList";
import { getEngagementSummary } from "@/lib/services/engagementService";
import { formatDate, formatMoney, formatRelative } from "@/lib/utils";

export default async function EngagementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const role = session.user.role as Role;
  if (role !== "CEO" && role !== "OFFICE") redirect("/dashboard");

  const e = await getEngagementSummary(id);
  if (!e) notFound();

  const [attachable, recentLogs] = await Promise.all([
    prisma.project.findMany({
      where: { clientId: e.clientId, engagementId: null, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, code: true, status: true },
    }),
    e.jobs.length
      ? prisma.dailyLog.findMany({
          where: { projectId: { in: e.jobs.map((j) => j.id) } },
          orderBy: { date: "desc" },
          take: 8,
          select: {
            id: true,
            date: true,
            notes: true,
            clientVisible: true,
            author: { select: { name: true } },
            project: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const committedCents = e.contractCents + e.approvedChangeCents;
  const remainingCents = committedCents - e.actualCents;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <EngagementHeader
        id={e.id}
        name={e.name}
        description={e.description}
        status={e.status}
        clientId={e.clientId}
        clientName={e.clientName}
        jobCount={e.jobs.length}
      />

      <div className="px-6 pb-8 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Contract" value={formatMoney(e.contractCents)} hint="across all jobs" />
          <StatCard
            label="Change orders"
            value={`${e.approvedChangeCents >= 0 ? "+" : ""}${formatMoney(e.approvedChangeCents)}`}
            hint="approved, net"
          />
          <StatCard label="Cost to date" value={formatMoney(e.actualCents)} hint={`budget ${formatMoney(e.estimateCents)}`} />
          <StatCard
            label="Remaining"
            value={formatMoney(remainingCents)}
            hint="contract + COs − cost"
            tone={remainingCents < 0 ? "warn" : "default"}
          />
          <StatCard
            label="Complete"
            value={e.percentComplete == null ? "—" : `${e.percentComplete}%`}
            hint={
              e.milestonesTotal > 0
                ? `${e.milestonesDone}/${e.milestonesTotal} milestones`
                : e.percentComplete == null
                  ? "no milestones or schedule yet"
                  : "schedule progress"
            }
            tone={e.percentComplete === 100 ? "good" : "default"}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <AttentionList items={e.attention} showJob />

            <section className="hh-panel overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
                <h2 className="hh-label">Jobs</h2>
                <span className="hh-secondary">
                  {e.openJobs} open · {e.jobs.length} total
                </span>
              </div>
              {e.jobs.length === 0 ? (
                <p className="hh-secondary px-6 py-5">No jobs attached yet — attach one below or create a new one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-glass-border">
                      <tr>
                        <th className="hh-label px-5 py-3 text-left">Job</th>
                        <th className="hh-label px-5 py-3 text-left">Status</th>
                        <th className="hh-label px-5 py-3 text-left">Phase</th>
                        <th className="hh-label px-5 py-3 text-left">PM</th>
                        <th className="hh-label px-5 py-3 text-right">Milestones</th>
                        <th className="hh-label px-5 py-3 text-left">Last log</th>
                        <th className="hh-label px-5 py-3 text-right">Contract</th>
                        <th className="hh-label px-5 py-3 text-right">Cost</th>
                        <th className="hh-label px-5 py-3 text-right">Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                      {e.jobs.map((j) => {
                        const red = j.attention.filter((a) => a.severity === "red").length;
                        const orange = j.attention.length - red;
                        const over = j.estimateCents > 0 && j.actualCents > j.estimateCents;
                        return (
                          <tr key={j.id} className="hh-row--flat">
                            <td className="px-5 py-3">
                              <Link href={`/jobs/${j.id}`} className="hh-primary hover:underline">
                                {j.name}
                              </Link>
                              {j.code && <span className="hh-caption ml-1.5">#{j.code}</span>}
                            </td>
                            <td className="px-5 py-3">
                              <span className={j.status === "OPEN" ? "hh-badge hh-badge--success" : "hh-badge"}>{j.status}</span>
                            </td>
                            <td className="px-5 py-3 hh-secondary">{j.constructionPhase ?? j.pipelineStage ?? "—"}</td>
                            <td className="px-5 py-3 hh-secondary">{j.projectManager ?? "—"}</td>
                            <td className="px-5 py-3 text-right tabular-nums hh-secondary">
                              {j.milestonesTotal ? `${j.milestonesDone}/${j.milestonesTotal}` : "—"}
                            </td>
                            <td className="px-5 py-3 hh-secondary">{j.lastLogAt ? formatRelative(j.lastLogAt) : "—"}</td>
                            <td className="px-5 py-3 text-right tabular-nums hh-secondary">{formatMoney(j.contractCents)}</td>
                            <td className={`px-5 py-3 text-right tabular-nums ${over ? "text-status-error font-semibold" : "hh-secondary"}`}>
                              {formatMoney(j.actualCents)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="inline-flex items-center gap-2 justify-end">
                                {red > 0 && (
                                  <span className="inline-flex items-center gap-1 tabular-nums hh-secondary">
                                    <span className="hh-dot hh-dot--red" /> {red}
                                  </span>
                                )}
                                {orange > 0 && (
                                  <span className="inline-flex items-center gap-1 tabular-nums hh-secondary">
                                    <span className="hh-dot hh-dot--orange" /> {orange}
                                  </span>
                                )}
                                {red + orange === 0 && <span className="hh-dot hh-dot--green" />}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="hh-panel p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="hh-label">Recent activity</h2>
                <Link href="/jobs/daily-logs" className="btn-ghost text-xs">
                  All daily logs →
                </Link>
              </div>
              {recentLogs.length === 0 ? (
                <span className="hh-secondary">No daily logs across this project yet.</span>
              ) : (
                recentLogs.map((l) => (
                  <div key={l.id} className="hh-row hh-row--flat flex-col !items-start !gap-0.5">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="hh-secondary">
                        <Link href={`/projects/${l.project.id}`} className="hh-primary hover:underline">
                          {l.project.name}
                        </Link>{" "}
                        · {l.author.name} · {formatRelative(l.date)}
                      </span>
                      {l.clientVisible && <span className="hh-badge hh-badge--success">client</span>}
                    </div>
                    <p className="hh-secondary line-clamp-2">{l.notes.replace(/^Synced from JobTread[^\n]*\n?\n?/, "")}</p>
                  </div>
                ))
              )}
            </section>
          </div>

          <div className="flex flex-col gap-5">
            <section className="hh-panel p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="hh-label">Upcoming milestones</h2>
                <span className="hh-secondary tabular-nums">{e.upcomingMilestones.length} open</span>
              </div>
              {e.upcomingMilestones.length === 0 ? (
                <span className="hh-secondary">
                  {e.milestonesTotal > 0 ? "Every milestone is done." : "No milestones set on any job yet."}
                </span>
              ) : (
                e.upcomingMilestones.slice(0, 8).map((m) => {
                  const overdue = m.dueDate != null && m.dueDate < today;
                  return (
                    <Link key={m.id} href={`/projects/${m.jobId}`} className="hh-row hh-row--flat flex-col !items-start !gap-0.5">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="hh-primary truncate">{m.title}</span>
                        <span className={overdue ? "text-status-error text-xs font-semibold whitespace-nowrap" : "hh-caption whitespace-nowrap"}>
                          {m.dueDate ? formatDate(m.dueDate) : "no date"}
                        </span>
                      </div>
                      <span className="hh-caption">
                        {m.jobName}
                        {m.status === "BLOCKED" ? " · blocked" : m.status === "IN_PROGRESS" ? " · in progress" : ""}
                      </span>
                    </Link>
                  );
                })
              )}
            </section>

            <section className="hh-panel p-5 flex flex-col gap-2">
              <h2 className="hh-label">Timeline</h2>
              <Row k="First start" v={formatDate(earliest(e.jobs.map((j) => j.startDate)))} />
              <Row k="Last target finish" v={formatDate(latest(e.jobs.map((j) => j.targetEnd)))} />
              <Row k="Last activity" v={e.lastActivityAt ? formatRelative(e.lastActivityAt) : "—"} />
              <Row k="Project updated" v={formatRelative(e.updatedAt)} />
            </section>

            <EngagementJobs
              engagementId={e.id}
              jobs={e.jobs.map((j) => ({
                id: j.id,
                name: j.name,
                code: j.code,
                status: j.status,
                constructionPhase: j.constructionPhase,
              }))}
              attachable={attachable}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="hh-secondary">{k}</span>
      <span className="hh-primary text-right">{v}</span>
    </div>
  );
}

function earliest(dates: (Date | null)[]) {
  const ts = dates.filter((d): d is Date => d != null).map((d) => d.getTime());
  return ts.length ? new Date(Math.min(...ts)) : null;
}

function latest(dates: (Date | null)[]) {
  const ts = dates.filter((d): d is Date => d != null).map((d) => d.getTime());
  return ts.length ? new Date(Math.max(...ts)) : null;
}
