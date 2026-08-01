"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, AlertTriangle, Search, HardHat } from "lucide-react";
import { createVendor } from "../vendors/vendorActions";
import { VendorForm, CoiBadge, W9Badge, getCoiStatus, type Vendor } from "../vendors/VendorsClient";

type Props = {
  subs: Vendor[];
  vendorTrades: string[];
  divisions: string[];
  complianceSummary: {
    expiredCount: number;
    expiringCount: number;
    missingW9Count: number;
  };
};

function Toast({ msg, ok, onDone }: { msg: string; ok: boolean; onDone: () => void }) {
  return (
    <div
      role="status"
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff",
        background: ok ? "var(--hh-dot-green,#22c55e)" : "var(--hh-dot-red,#ef4444)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      }}
    >
      {msg}
      <button onClick={onDone} style={{ marginLeft: 10, opacity: 0.7 }}>✕</button>
    </div>
  );
}

type FilterMode = "all" | "expiring" | "expired" | "missing-w9";

export default function SubsClient({ subs, vendorTrades, divisions, complianceSummary }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  function flash(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const filtered = useMemo(() => {
    let list = subs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.trade?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q)
      );
    }
    if (filter === "expiring") {
      list = list.filter((v) => getCoiStatus(v.coiExpiresAt) === "expiring");
    } else if (filter === "expired") {
      list = list.filter((v) => getCoiStatus(v.coiExpiresAt) === "expired");
    } else if (filter === "missing-w9") {
      list = list.filter((v) => !v.w9OnFile);
    }
    return list;
  }, [subs, search, filter]);

  function handleCreate(fd: FormData) {
    start(async () => {
      const r = await createVendor(fd);
      flash(r.ok, r.ok ? "Sub added" : (r.error ?? "Failed"));
      if (r.ok) { setShowAdd(false); router.refresh(); }
    });
  }

  const { expiredCount, expiringCount, missingW9Count } = complianceSummary;
  const hasAlerts = expiredCount > 0 || expiringCount > 0 || missingW9Count > 0;

  return (
    <div className="space-y-5">
      {hasAlerts && (
        <div
          className="rounded-xl p-4 flex flex-wrap gap-4 items-center"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
        >
          <AlertTriangle size={16} style={{ color: "var(--hh-dot-red,#ef4444)" }} className="shrink-0" />
          <span className="text-sm font-semibold" style={{ color: "var(--hh-dot-red,#ef4444)" }}>
            Compliance alerts:
          </span>
          {expiredCount  > 0 && <span className="text-sm text-ink">{expiredCount} COI expired</span>}
          {expiringCount > 0 && <span className="text-sm text-ink">{expiringCount} COI expiring within 30 days</span>}
          {missingW9Count > 0 && <span className="text-sm text-ink">{missingW9Count} missing W-9</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input pl-8 text-sm w-full"
            placeholder="Search subs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {(
            [
              { key: "all",        label: "All" },
              { key: "expired",    label: `Expired COI${expiredCount  ? ` (${expiredCount})`  : ""}` },
              { key: "expiring",   label: `Expiring soon${expiringCount ? ` (${expiringCount})` : ""}` },
              { key: "missing-w9", label: `Missing W-9${missingW9Count ? ` (${missingW9Count})` : ""}` },
            ] as { key: FilterMode; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
              style={{
                background: filter === key ? "var(--accent)" : "var(--glass-bg)",
                color: filter === key ? "#fff" : "var(--ink-soft)",
                border: filter === key ? "none" : "1px solid var(--glass-border)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowAdd((v) => !v)} className="btn-primary text-sm flex items-center gap-1 shrink-0">
          <Plus size={14} /> Add sub
        </button>
      </div>

      {showAdd && (
        <VendorForm
          vendorTrades={vendorTrades}
          vendorTypes={["Subcontractor"]}
          divisions={divisions}
          defaultType="Subcontractor"
          addLabel="Add sub"
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          pending={pending}
        />
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <HardHat size={32} className="mx-auto mb-3 text-ink-muted opacity-40" />
          <p className="text-sm text-ink-muted">
            {search || filter !== "all" ? "No subs match the current filter." : "No subs yet — add your first one above."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <Link
              key={sub.id}
              href={`/subs/${sub.id}`}
              className="block rounded-xl p-4 transition-colors hover:border-accent"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{sub.name}</span>
                    {sub.trade && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--ink-soft)" }}
                      >
                        {sub.trade}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    {sub.email && <span className="text-xs text-ink-muted">{sub.email}</span>}
                    {sub.officePhone && <span className="text-xs text-ink-muted">{sub.officePhone}</span>}
                    {sub.division && <span className="text-xs text-ink-muted">{sub.division}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <W9Badge onFile={sub.w9OnFile} />
                    <CoiBadge coiExpiresAt={sub.coiExpiresAt} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}
    </div>
  );
}
