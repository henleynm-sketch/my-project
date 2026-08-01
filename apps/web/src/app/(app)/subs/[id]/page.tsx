import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import SubDetailClient from "./SubDetailClient";
import { VENDOR_TRADE, VENDOR_TYPE, DIVISION } from "@/lib/taxonomy";

export default async function SubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const role = session.user.role as string;
  if (role !== "CEO" && role !== "OFFICE") redirect("/dashboard");

  const { id } = await params;
  const sub = await prisma.vendor.findUnique({ where: { id } });
  if (!sub || sub.archivedAt) redirect("/subs");

  const serialized = {
    id:           sub.id,
    name:         sub.name,
    trade:        sub.trade,
    type:         sub.type,
    email:        sub.email,
    officePhone:  sub.officePhone,
    fax:          sub.fax,
    division:     sub.division,
    w9OnFile:     sub.w9OnFile,
    emailOptOut:  sub.emailOptOut,
    coiExpiresAt: sub.coiExpiresAt?.toISOString() ?? null,
    notes:        sub.notes,
    createdAt:    sub.createdAt.toISOString(),
    updatedAt:    sub.updatedAt.toISOString(),
  };

  return (
    <>
      <PageHeader title={sub.name} subtitle={sub.trade ?? "Subcontractor"} />
      <div className="p-6">
        <SubDetailClient
          sub={serialized}
          vendorTrades={[...VENDOR_TRADE]}
          vendorTypes={[...VENDOR_TYPE]}
          divisions={[...DIVISION]}
        />
      </div>
    </>
  );
}
