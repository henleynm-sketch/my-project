"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Pencil } from "lucide-react";
import { setEngagementDetails, setEngagementStatus } from "@/lib/actions/engagementMeta";
import { ENGAGEMENT_STATUSES, ENGAGEMENT_STATUS_LABELS } from "@/lib/engagementStatus";

export default function EngagementHeader({
  id,
  name,
  description,
  status,
  clientId,
  clientName,
  jobCount,
}: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientId: string;
  clientName: string;
  jobCount: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Save failed");
      else after?.();
    });
  }

  return (
    <div className="sticky top-0 z-50 px-6 py-5 glass-base">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/clients/${clientId}`} className="hh-caption uppercase hover:underline">
            {clientName}
          </Link>
          {editing ? (
            <form
              className="mt-1 flex flex-col gap-2 max-w-xl"
              action={(fd) =>
                run(
                  () =>
                    setEngagementDetails(id, {
                      name: String(fd.get("name") || ""),
                      description: String(fd.get("description") || ""),
                    }),
                  () => setEditing(false),
                )
              }
            >
              <input name="name" className="input text-lg font-semibold" defaultValue={name} required autoFocus />
              <textarea
                name="description"
                className="input text-sm"
                rows={2}
                defaultValue={description ?? ""}
                placeholder="What this project is, in one or two lines"
              />
              <div className="flex gap-2">
                <button className="btn-primary text-xs" disabled={pending}>
                  Save
                </button>
                <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="hh-display text-2xl font-bold tracking-tight text-ink truncate">{name}</h1>
                <button
                  type="button"
                  className="btn-ghost !p-1.5"
                  aria-label="Edit project name and description"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={13} />
                </button>
              </div>
              <p className="mt-1 hh-secondary">
                {jobCount} {jobCount === 1 ? "job" : "jobs"}
                {description ? ` · ${description}` : ""}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pending && <Loader2 size={14} className="animate-spin opacity-60" />}
          <select
            className="input !w-auto text-xs"
            value={status}
            disabled={pending}
            aria-label="Project status"
            onChange={(e) => run(() => setEngagementStatus(id, e.target.value))}
          >
            {ENGAGEMENT_STATUSES.map((v) => (
              <option key={v} value={v}>
                {ENGAGEMENT_STATUS_LABELS[v]}
              </option>
            ))}
          </select>
          <Link href={`/clients/${clientId}`} className="btn-secondary text-xs">
            View client
          </Link>
          <Link href={`/projects/new?clientId=${clientId}&engagementId=${id}`} className="btn-primary text-xs">
            + New job
          </Link>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2">
          <span className="hh-dot hh-dot--red" />
          <span className="hh-secondary">{error}</span>
        </div>
      )}
    </div>
  );
}
