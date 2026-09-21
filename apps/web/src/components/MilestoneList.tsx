"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import {
  createMilestoneAction,
  deleteMilestoneAction,
  setMilestoneStatusAction,
  updateMilestoneAction,
} from "@/app/(app)/projects/[id]/milestoneActions";
import { formatDate } from "@/lib/utils";

export type MilestoneRow = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  clientVisible: boolean;
};

const STATUSES = [
  ["PENDING", "Pending"],
  ["IN_PROGRESS", "In progress"],
  ["DONE", "Done"],
  ["BLOCKED", "Blocked"],
] as const;

function badge(status: string) {
  if (status === "DONE") return "hh-badge hh-badge--success";
  if (status === "BLOCKED") return "hh-badge hh-badge--danger";
  return "hh-badge";
}

function toInputDate(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

export default function MilestoneList({
  projectId,
  milestones,
  canSetStatus,
  canManage,
}: {
  projectId: string;
  milestones: MilestoneRow[];
  canSetStatus: boolean;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const done = milestones.filter((m) => m.status === "DONE").length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Action failed");
      else after?.();
    });
  }

  return (
    <section className="hh-panel p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3">
        <h2 className="hh-label">Milestones</h2>
        <div className="flex items-center gap-3">
          {pending && <Loader2 size={13} className="animate-spin opacity-60" />}
          <span className="hh-secondary">
            {done} / {milestones.length} done
          </span>
        </div>
      </div>

      {milestones.length === 0 && !adding && (
        <span className="hh-secondary">No milestones yet{canManage ? " — add the first one below." : "."}</span>
      )}

      <ul className="space-y-2">
        {milestones.map((m) => {
          const due = m.dueDate ? new Date(m.dueDate) : null;
          const overdue = due != null && due < today && m.status !== "DONE";
          return (
            <li key={m.id} className="hh-row justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="hh-primary flex items-center gap-2">
                  <span className="truncate">{m.title}</span>
                  {!m.clientVisible && (
                    <span className="hh-caption inline-flex items-center gap-1" title="Internal only">
                      <EyeOff size={11} /> internal
                    </span>
                  )}
                </div>
                <div className={`mt-0.5 ${overdue ? "text-status-error font-medium text-sm" : "hh-secondary"}`}>
                  {canManage ? (
                    <input
                      type="date"
                      className="input !w-auto !py-0.5 text-xs"
                      defaultValue={toInputDate(m.dueDate)}
                      disabled={pending}
                      aria-label={`Due date for ${m.title}`}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        if (v === toInputDate(m.dueDate) || (v === null && !m.dueDate)) return;
                        run(() => updateMilestoneAction(m.id, { dueDate: v }));
                      }}
                    />
                  ) : due ? (
                    `Due ${formatDate(due)}`
                  ) : (
                    "No due date"
                  )}
                  {overdue && <span className="ml-2">overdue</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canSetStatus ? (
                  <select
                    className="input !w-auto py-1 text-xs"
                    value={m.status}
                    disabled={pending}
                    aria-label={`Status for ${m.title}`}
                    onChange={(e) => run(() => setMilestoneStatusAction(m.id, e.target.value))}
                  >
                    {STATUSES.map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={badge(m.status)}>{m.status.replace("_", " ").toLowerCase()}</span>
                )}
                {canManage && (
                  <>
                    <button
                      type="button"
                      className="btn-ghost !p-1.5"
                      disabled={pending}
                      title={m.clientVisible ? "Visible to client — click to hide" : "Internal — click to show to client"}
                      aria-label={m.clientVisible ? `Hide ${m.title} from client` : `Show ${m.title} to client`}
                      onClick={() => run(() => updateMilestoneAction(m.id, { clientVisible: !m.clientVisible }))}
                    >
                      {m.clientVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !p-1.5"
                      disabled={pending}
                      aria-label={`Delete ${m.title}`}
                      onClick={() => {
                        if (!window.confirm(`Delete milestone "${m.title}"?`)) return;
                        run(() => deleteMilestoneAction(m.id));
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canManage &&
        (adding ? (
          <form
            className="flex flex-wrap items-end gap-2 border-t border-glass-border pt-3"
            action={(fd) => run(() => createMilestoneAction(fd), () => setAdding(false))}
          >
            <input type="hidden" name="projectId" value={projectId} />
            <div className="flex-1 min-w-[180px]">
              <label className="hh-label block mb-1">Milestone</label>
              <input name="title" className="input text-sm" placeholder="e.g. Framing inspection passed" required autoFocus />
            </div>
            <div>
              <label className="hh-label block mb-1">Due</label>
              <input type="date" name="dueDate" className="input text-sm" />
            </div>
            <label className="flex items-center gap-1.5 hh-secondary pb-2">
              <input type="checkbox" name="clientVisible" defaultChecked /> Client sees it
            </label>
            <button className="btn-primary text-xs" disabled={pending}>
              Add
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="btn-secondary text-xs inline-flex items-center gap-1 self-start"
            onClick={() => setAdding(true)}
          >
            <Plus size={13} /> Add milestone
          </button>
        ))}

      {error && (
        <div className="flex items-center gap-2">
          <span className="hh-dot hh-dot--red" />
          <span className="hh-secondary">{error}</span>
        </div>
      )}
    </section>
  );
}
