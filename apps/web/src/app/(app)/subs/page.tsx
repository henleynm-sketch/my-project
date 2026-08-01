import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import SubsClient from "./SubsClient";
import { VENDOR_TRADE, DIVISION } from "@/lib/taxonomy";

export default async function SubsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const role = session.user.role as string;
  if (role !== "CEO" && role !== "OFFICE") redirect("/dashboard");

  const now = new Date();
  const cutoff30 = new Date();
  cutoff30.setDate(now.getDate() + 30);

  const subs = await prisma.vendor.findMany({
    where: { archivedAt: null, type: "Subcontractor" },
    orderBy: [{ name: "asc" }],
  });

  const serialized = subs.map((v) => ({
    id:           v.id,
    name:         v.name,
    trade:        v.trade,
    type:         v.type,
    email:        v.email,
    officePhone:  v.officePhone,
    fax:          v.fax,
    division:     v.division,
    w9OnFile:     v.w9OnFile,
    emailOptOut:  v.emailOptOut,
    coiExpiresAt: v.coiExpiresAt?.toISOString() ?? null,
    notes:        v.notes,
    createdAt:    v.createdAt.toISOString(),
    updatedAt:    v.updatedAt.toISOString(),
  }));

  const expiredCount  = subs.filter((v) => v.coiExpiresAt && v.coiExpiresAt < now).length;
  const expiringCount = subs.filter(
    (v) => v.coiExpiresAt && v.coiExpiresAt >= now && v.coiExpiresAt <= cutoff30
  ).length;
  const missingW9Count = subs.filter((v) => !v.w9OnFile).length;

  return (
    <>
      <PageHeader
        title="Subs"
        subtitle={`${subs.length} subcontractor${subs.length !== 1 ? "s" : ""} · W-9 and COI compliance`}
      />
      <div className="p-6">
        <SubsClient
          subs={serialized}
          vendorTrades={[...VENDOR_TRADE]}
          divisions={[...DIVISION]}
          complianceSummary={{ expiredCount, expiringCount, missingW9Count }}
        />
      </div>
    </>
  );
}
