import "server-only";
import { prisma } from "@/lib/prisma";

export { ENGAGEMENT_STATUSES, isEngagementStatus, type EngagementStatus } from "@/lib/engagementStatus";

const OPEN_JOB_STATUSES = ["OPEN", "WARRANTY", "PRESALE", "GENERAL"];
const STALE_LOG_DAYS = 7;
const DAY_MS = 86_400_000;

export type AttentionKind =
  | "MILESTONE_OVERDUE"
  | "MILESTONE_BLOCKED"
  | "OVER_BUDGET"
  | "CHANGE_ORDER_AWAITING"
  | "SCHEDULE_SLIP"
  | "JOB_PAST_TARGET"
  | "JOB_STALE";

export type AttentionItem = {
  kind: AttentionKind;
  severity: "red" | "orange";
  jobId: string;
  jobName: string;
  title: string;
  detail: string;
  href: string;
  since: Date | null;
};

export type MilestoneRef = {
  id: string;
  jobId: string;
  jobName: string;
  title: string;
  dueDate: Date | null;
  status: string;
  clientVisible: boolean;
};

export type JobRollup = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  constructionPhase: string | null;
  pipelineStage: string | null;
  projectManager: string | null;
  startDate: Date | null;
  targetEnd: Date | null;
  contractCents: number;
  estimateCents: number;
  actualCents: number;
  approvedChangeCents: number;
  milestonesDone: number;
  milestonesTotal: number;
  nextMilestone: MilestoneRef | null;
  lastLogAt: Date | null;
  attention: AttentionItem[];
};

export type EngagementSummary = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientId: string;
  clientName: string;
  updatedAt: Date;
  jobs: JobRollup[];
  openJobs: number;
  contractCents: number;
  estimateCents: number;
  actualCents: number;
  approvedChangeCents: number;
  milestonesDone: number;
  milestonesTotal: number;
  percentComplete: number | null;
  upcomingMilestones: MilestoneRef[];
  nextMilestone: MilestoneRef | null;
  lastActivityAt: Date | null;
  attention: AttentionItem[];
  redCount: number;
  orangeCount: number;
};

const jobInclude = {
  milestones: {
    select: { id: true, title: true, dueDate: true, status: true, clientVisible: true, order: true },
  },
  budgetItems: { select: { estimateCents: true, actualCents: true } },
  changeOrders: {
    select: { id: true, number: true, title: true, status: true, amountCents: true, sentAt: true, createdAt: true },
  },
  scheduleTasks: { select: { id: true, name: true, endDate: true, progress: true } },
  dailyLogs: { orderBy: { date: "desc" as const }, take: 1, select: { date: true } },
} as const;

type JobRecord = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  constructionPhase: string | null;
  pipelineStage: string | null;
  projectManager: string | null;
  startDate: Date | null;
  targetEnd: Date | null;
  actualEnd: Date | null;
  contractCents: number;
  budgetCents: number;
  archivedAt: Date | null;
  milestones: { id: string; title: string; dueDate: Date | null; status: string; clientVisible: boolean; order: number }[];
  budgetItems: { estimateCents: number; actualCents: number }[];
  changeOrders: { id: string; number: string; title: string; status: string; amountCents: number; sentAt: Date | null; createdAt: Date }[];
  scheduleTasks: { id: string; name: string; endDate: Date; progress: number }[];
  dailyLogs: { date: Date }[];
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(d: Date, now: Date) {
  return Math.floor((now.getTime() - d.getTime()) / DAY_MS);
}

function byDueDate(a: MilestoneRef, b: MilestoneRef) {
  if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
}

export function rollupJob(job: JobRecord, now = new Date()): JobRollup {
  const today = startOfToday();
  const isOpen = OPEN_JOB_STATUSES.includes(job.status) && !job.archivedAt;
  const isActiveSite = job.status === "OPEN" && !job.archivedAt;
  const href = `/projects/${job.id}`;

  const estimateCents = job.budgetItems.reduce((a, b) => a + b.estimateCents, 0) || job.budgetCents;
  const actualCents = job.budgetItems.reduce((a, b) => a + b.actualCents, 0);
  const approvedChangeCents = job.changeOrders
    .filter((c) => c.status === "APPROVED")
    .reduce((a, c) => a + c.amountCents, 0);

  const milestoneRefs: MilestoneRef[] = job.milestones.map((m) => ({
    id: m.id,
    jobId: job.id,
    jobName: job.name,
    title: m.title,
    dueDate: m.dueDate,
    status: m.status,
    clientVisible: m.clientVisible,
  }));
  const openMilestones = milestoneRefs.filter((m) => m.status !== "DONE").sort(byDueDate);
  const nextMilestone = openMilestones.find((m) => m.dueDate) ?? openMilestones[0] ?? null;
  const lastLogAt = job.dailyLogs[0]?.date ?? null;

  const attention: AttentionItem[] = [];
  if (isOpen) {
    for (const m of openMilestones) {
      if (m.status === "BLOCKED") {
        attention.push({
          kind: "MILESTONE_BLOCKED",
          severity: "red",
          jobId: job.id,
          jobName: job.name,
          title: `Blocked: ${m.title}`,
          detail: m.dueDate ? `due ${m.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "no due date",
          href,
          since: m.dueDate,
        });
      } else if (m.dueDate && m.dueDate < today) {
        attention.push({
          kind: "MILESTONE_OVERDUE",
          severity: "red",
          jobId: job.id,
          jobName: job.name,
          title: `Overdue: ${m.title}`,
          detail: `${daysAgo(m.dueDate, now)}d late`,
          href,
          since: m.dueDate,
        });
      }
    }
    if (estimateCents > 0 && actualCents > estimateCents) {
      attention.push({
        kind: "OVER_BUDGET",
        severity: "red",
        jobId: job.id,
        jobName: job.name,
        title: "Over budget",
        detail: `${Math.round(((actualCents - estimateCents) / estimateCents) * 100)}% over estimate`,
        href,
        since: null,
      });
    }
    for (const c of job.changeOrders) {
      if (c.status !== "SENT") continue;
      const sent = c.sentAt ?? c.createdAt;
      attention.push({
        kind: "CHANGE_ORDER_AWAITING",
        severity: "orange",
        jobId: job.id,
        jobName: job.name,
        title: `CO ${c.number} awaiting client`,
        detail: `${c.title} · sent ${daysAgo(sent, now)}d ago`,
        href,
        since: sent,
      });
    }
    for (const t of job.scheduleTasks) {
      if (t.progress < 1 && t.endDate < today) {
        attention.push({
          kind: "SCHEDULE_SLIP",
          severity: "orange",
          jobId: job.id,
          jobName: job.name,
          title: `Behind: ${t.name}`,
          detail: `${Math.round(t.progress * 100)}% done, ended ${daysAgo(t.endDate, now)}d ago`,
          href: `/schedule?projectId=${job.id}`,
          since: t.endDate,
        });
      }
    }
    if (isActiveSite && job.targetEnd && job.targetEnd < today && !job.actualEnd) {
      attention.push({
        kind: "JOB_PAST_TARGET",
        severity: "orange",
        jobId: job.id,
        jobName: job.name,
        title: "Past target finish",
        detail: `${daysAgo(job.targetEnd, now)}d past target, still open`,
        href,
        since: job.targetEnd,
      });
    }
    if (isActiveSite && (!lastLogAt || daysAgo(lastLogAt, now) >= STALE_LOG_DAYS)) {
      attention.push({
        kind: "JOB_STALE",
        severity: "orange",
        jobId: job.id,
        jobName: job.name,
        title: "No recent daily log",
        detail: lastLogAt ? `last log ${daysAgo(lastLogAt, now)}d ago` : "never logged",
        href,
        since: lastLogAt,
      });
    }
  }

  return {
    id: job.id,
    name: job.name,
    code: job.code,
    status: job.status,
    constructionPhase: job.constructionPhase,
    pipelineStage: job.pipelineStage,
    projectManager: job.projectManager,
    startDate: job.startDate,
    targetEnd: job.targetEnd,
    contractCents: job.contractCents,
    estimateCents,
    actualCents,
    approvedChangeCents,
    milestonesDone: milestoneRefs.filter((m) => m.status === "DONE").length,
    milestonesTotal: milestoneRefs.length,
    nextMilestone,
    lastLogAt,
    attention,
  };
}

function sortAttention(a: AttentionItem, b: AttentionItem) {
  if (a.severity !== b.severity) return a.severity === "red" ? -1 : 1;
  const at = a.since?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bt = b.since?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return at - bt;
}

type EngagementRecord = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientId: string;
  updatedAt: Date;
  client: { name: string };
  jobs: JobRecord[];
};

export function summarizeEngagement(e: EngagementRecord, now = new Date()): EngagementSummary {
  const jobs = e.jobs.map((j) => rollupJob(j, now));
  const sum = (pick: (j: JobRollup) => number) => jobs.reduce((a, j) => a + pick(j), 0);
  const milestonesDone = sum((j) => j.milestonesDone);
  const milestonesTotal = sum((j) => j.milestonesTotal);

  let percentComplete: number | null = null;
  if (milestonesTotal > 0) {
    percentComplete = Math.round((milestonesDone / milestonesTotal) * 100);
  } else {
    const tasks = e.jobs.flatMap((j) => j.scheduleTasks);
    if (tasks.length > 0) {
      percentComplete = Math.round((tasks.reduce((a, t) => a + t.progress, 0) / tasks.length) * 100);
    }
  }

  const upcomingMilestones = e.jobs
    .filter((j) => !j.archivedAt && OPEN_JOB_STATUSES.includes(j.status))
    .flatMap((j) =>
      j.milestones
        .filter((m) => m.status !== "DONE")
        .map<MilestoneRef>((m) => ({
          id: m.id,
          jobId: j.id,
          jobName: j.name,
          title: m.title,
          dueDate: m.dueDate,
          status: m.status,
          clientVisible: m.clientVisible,
        })),
    )
    .sort(byDueDate);

  const attention = jobs.flatMap((j) => j.attention).sort(sortAttention);
  const logDates = jobs.map((j) => j.lastLogAt).filter((d): d is Date => d != null);
  const lastActivityAt = logDates.length ? new Date(Math.max(...logDates.map((d) => d.getTime()))) : null;

  return {
    id: e.id,
    name: e.name,
    description: e.description,
    status: e.status,
    clientId: e.clientId,
    clientName: e.client.name,
    updatedAt: e.updatedAt,
    jobs,
    openJobs: jobs.filter((j) => OPEN_JOB_STATUSES.includes(j.status)).length,
    contractCents: sum((j) => j.contractCents),
    estimateCents: sum((j) => j.estimateCents),
    actualCents: sum((j) => j.actualCents),
    approvedChangeCents: sum((j) => j.approvedChangeCents),
    milestonesDone,
    milestonesTotal,
    percentComplete,
    upcomingMilestones,
    nextMilestone: upcomingMilestones.find((m) => m.dueDate) ?? upcomingMilestones[0] ?? null,
    lastActivityAt,
    attention,
    redCount: attention.filter((a) => a.severity === "red").length,
    orangeCount: attention.filter((a) => a.severity === "orange").length,
  };
}

export async function listEngagementSummaries(where: { status?: string; clientId?: string } = {}) {
  const rows = await prisma.engagement.findMany({
    where: {
      ...(where.status ? { status: where.status } : {}),
      ...(where.clientId ? { clientId: where.clientId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { name: true } },
      jobs: { where: { archivedAt: null }, include: jobInclude },
    },
  });
  return rows.map((r) => summarizeEngagement(r));
}

export async function getEngagementSummary(id: string) {
  const row = await prisma.engagement.findUnique({
    where: { id },
    include: {
      client: { select: { name: true } },
      jobs: { where: { archivedAt: null }, orderBy: { updatedAt: "desc" }, include: jobInclude },
    },
  });
  return row ? summarizeEngagement(row) : null;
}

// Every attention item across active projects, red first, oldest first.
export async function listPortfolioAttention(limit = 20) {
  const summaries = await listEngagementSummaries({ status: "ACTIVE" });
  const items = summaries
    .flatMap((s) => s.attention.map((a) => ({ ...a, engagementId: s.id, engagementName: s.name })))
    .sort(sortAttention);
  return { items: items.slice(0, limit), total: items.length, projects: summaries.filter((s) => s.attention.length).length };
}
