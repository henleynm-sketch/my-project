"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Printer, StickyNote } from "lucide-react";
import { updateVendor, deleteVendor } from "../../vendors/vendorActions";
import { VendorForm, CoiBadge, W9Badge, type Vendor } from "../../vendors/VendorsClient";

type Props = {
  sub: Vendor;
  vendorTrades: string[];
  vendorTypes: string[];
  divisions: string[];
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

export default function SubDetailClient({ sub, vendorTrades, vendorTypes, divisions }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editing, setEditing] = useState(false);

  function flash(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function handleUpdate(fd: FormData) {
    start(async () => {
      const r = await updateVendor(sub.id, fd);
      flash(r.ok, r.ok ? "Saved" : (r.error ?? "Failed"));
      if (r.ok) { setEditing(false); router.refresh(); }
    });
  }

  function handleArchive() {
    if (!confirm(`Archive ${sub.name}? They'll be removed from the subs directory.`)) return;
    start(async () => {
      const r = await deleteVendor(sub.id);
      flash(r.ok, r.ok ? "Sub archived" : (r.error ?? "Failed"));
      if (r.ok) router.push("/subs");
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/subs" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Back to Subs
      </Link>

      {editing ? (
        <VendorForm
          vendor={sub}
          vendorTrades={vendorTrades}
          vendorTypes={vendorTypes}
          divisions={divisions}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          pending={pending}
        />
      ) : (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {sub.trade && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--ink-soft)" }}
                >
                  {sub.trade}
                </span>
              )}
              {sub.division && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(92,124,250,0.08)", border: "1px solid rgba(92,124,250,0.18)", color: "var(--accent)" }}
                >
                  {sub.division}
                </span>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded text-ink-muted hover:text-ink transition-colors"
                aria-label="Edit sub"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleArchive}
                disabled={pending}
                className="p-1.5 rounded text-ink-muted hover:text-red-500 transition-colors"
                aria-label="Archive sub"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <W9Badge onFile={sub.w9OnFile} />
            <CoiBadge coiExpiresAt={sub.coiExpiresAt} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
            {sub.email && (
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <Mail size={14} className="text-ink-muted shrink-0" />
                <a href={`mailto:${sub.email}`} className="hover:text-ink transition-colors">{sub.email}</a>
              </div>
            )}
            {sub.officePhone && (
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <Phone size={14} className="text-ink-muted shrink-0" />
                <a href={`tel:${sub.officePhone}`} className="hover:text-ink transition-colors">{sub.officePhone}</a>
              </div>
            )}
            {sub.fax && (
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <Printer size={14} className="text-ink-muted shrink-0" />
                {sub.fax}
              </div>
            )}
          </div>

          {sub.notes && (
            <div className="flex gap-2 pt-1">
              <StickyNote size={14} className="text-ink-muted shrink-0 mt-0.5" />
              <p className="text-sm text-ink-soft whitespace-pre-wrap">{sub.notes}</p>
            </div>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}
    </div>
  );
}
