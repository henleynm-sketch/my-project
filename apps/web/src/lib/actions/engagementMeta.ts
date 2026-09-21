"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { isEngagementStatus } from "@/lib/engagementStatus";

export type EngagementMetaResult = { ok: boolean; error?: string };

async function office() {
  const me = await auth();
  if (!me?.user) return null;
  const role = me.user.role as Role;
  if (role !== "CEO" && role !== "OFFICE") return null;
  return me;
}

function revalidate(id: string) {
  revalidatePath("/jobs/projects");
  revalidatePath(`/jobs/projects/${id}`);
}

export async function setEngagementStatus(id: string, status: string): Promise<EngagementMetaResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not authorized" };
  if (!isEngagementStatus(status)) return { ok: false, error: "Invalid status" };
  const e = await prisma.engagement.findUnique({ where: { id }, select: { id: true } });
  if (!e) return { ok: false, error: "Project not found" };
  await prisma.engagement.update({ where: { id }, data: { status } });
  revalidate(id);
  return { ok: true };
}

export async function setEngagementDetails(
  id: string,
  patch: { name?: string; description?: string | null },
): Promise<EngagementMetaResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not authorized" };
  const e = await prisma.engagement.findUnique({ where: { id }, select: { id: true } });
  if (!e) return { ok: false, error: "Project not found" };
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return { ok: false, error: "Name is required" };
    data.name = name;
  }
  if (patch.description !== undefined) data.description = patch.description?.trim() || null;
  await prisma.engagement.update({ where: { id }, data });
  revalidate(id);
  return { ok: true };
}
