"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { Role } from "@/lib/roles";
import {
  createMilestone,
  deleteMilestone,
  getMilestoneById,
  listProjectMilestones,
  updateMilestone,
  updateMilestoneStatus,
} from "@/lib/services/milestoneService";

export type MilestoneResult = { ok: boolean; error?: string };

async function getMe() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as { id: string; role: Role };
}

function isManager(role: Role) {
  return role === "CEO" || role === "OFFICE";
}

function canSetStatus(role: Role) {
  return isManager(role) || role === "FIELD";
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/jobs/${projectId}`);
  revalidatePath("/jobs/projects");
}

function message(e: unknown) {
  return e instanceof Error ? e.message : "Action failed";
}

export async function createMilestoneAction(formData: FormData): Promise<MilestoneResult> {
  const me = await getMe();
  if (!me || !isManager(me.role)) return { ok: false, error: "Not authorized" };
  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  if (!projectId || !title) return { ok: false, error: "Title is required" };
  const dueDate = String(formData.get("dueDate") || "").trim() || null;
  try {
    const existing = await listProjectMilestones(projectId);
    const order = existing.reduce((max, m) => Math.max(max, m.order), -1) + 1;
    await createMilestone({
      projectId,
      title,
      dueDate,
      clientVisible: formData.get("clientVisible") === "on",
      order,
    });
  } catch (e) {
    return { ok: false, error: message(e) };
  }
  revalidate(projectId);
  return { ok: true };
}

export async function setMilestoneStatusAction(id: string, status: string): Promise<MilestoneResult> {
  const me = await getMe();
  if (!me || !canSetStatus(me.role)) return { ok: false, error: "Not authorized" };
  try {
    const m = await updateMilestoneStatus(id, status);
    revalidate(m.projectId);
  } catch (e) {
    return { ok: false, error: message(e) };
  }
  return { ok: true };
}

export async function updateMilestoneAction(
  id: string,
  patch: { title?: string; dueDate?: string | null; clientVisible?: boolean },
): Promise<MilestoneResult> {
  const me = await getMe();
  if (!me || !isManager(me.role)) return { ok: false, error: "Not authorized" };
  try {
    const m = await updateMilestone(id, patch);
    revalidate(m.projectId);
  } catch (e) {
    return { ok: false, error: message(e) };
  }
  return { ok: true };
}

export async function deleteMilestoneAction(id: string): Promise<MilestoneResult> {
  const me = await getMe();
  if (!me || !isManager(me.role)) return { ok: false, error: "Not authorized" };
  try {
    const m = await getMilestoneById(id);
    await deleteMilestone(id);
    revalidate(m.projectId);
  } catch (e) {
    return { ok: false, error: message(e) };
  }
  return { ok: true };
}
