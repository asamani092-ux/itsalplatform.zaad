import { prisma } from "@/lib/prisma";

const grantInclude = {
  department: { select: { id: true, name: true } },
  stages: { orderBy: { index: "asc" as const } },
};

/** Financial-resources section owns grants by default. */
async function defaultGrantDepartmentId(): Promise<string | null> {
  const section = await prisma.department.findUnique({
    where: { slug: "financial-resources" },
    select: { id: true },
  });
  return section?.id ?? null;
}

export async function listGrants() {
  return prisma.grant.findMany({
    include: grantInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getGrantById(id: string) {
  const grant = await prisma.grant.findUnique({ where: { id }, include: grantInclude });
  if (!grant) throw new Error("NOT_FOUND: المنحة غير موجودة");
  return grant;
}

export async function createGrant(params: {
  title: string;
  donorName: string;
  amount: number;
  details?: string;
  stageCount: number;
  departmentId?: string | null;
  createdById?: string | null;
}) {
  const stageCount = Math.max(0, Math.floor(params.stageCount));
  const departmentId = params.departmentId ?? (await defaultGrantDepartmentId());

  // With no stages the grant carries a single closure stage; otherwise generate
  // one follow-up stage per requested step, splitting the amount evenly as a hint.
  const stages =
    stageCount === 0
      ? [{ index: 1, label: "مرحلة الإغلاق", amount: params.amount }]
      : Array.from({ length: stageCount }, (_, i) => ({
          index: i + 1,
          label: `المرحلة ${i + 1}`,
          amount: Math.round((params.amount / stageCount) * 100) / 100,
        }));

  return prisma.grant.create({
    data: {
      title: params.title.trim(),
      donorName: params.donorName.trim(),
      amount: params.amount,
      details: params.details?.trim() ?? "",
      stageCount,
      departmentId,
      createdById: params.createdById ?? null,
      stages: { create: stages },
    },
    include: grantInclude,
  });
}

export async function updateGrantStage(params: {
  stageId: string;
  status?: "Pending" | "Done";
  note?: string;
  amount?: number | null;
  dueDate?: Date | null;
}) {
  const stage = await prisma.grantStage.update({
    where: { id: params.stageId },
    data: {
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.note !== undefined ? { note: params.note.trim() } : {}),
      ...(params.amount !== undefined ? { amount: params.amount } : {}),
      ...(params.dueDate !== undefined ? { dueDate: params.dueDate } : {}),
    },
  });
  return getGrantById(stage.grantId);
}

export async function setGrantStatus(params: {
  id: string;
  status: "Open" | "Closed";
}) {
  return prisma.grant.update({
    where: { id: params.id },
    data: {
      status: params.status,
      closedAt: params.status === "Closed" ? new Date() : null,
    },
    include: grantInclude,
  });
}

export async function deleteGrant(id: string) {
  await prisma.grant.delete({ where: { id } });
  return { id, deleted: true };
}

export async function getGrantKpis() {
  const now = new Date();
  const [grants, overdueStages] = await Promise.all([
    prisma.grant.findMany({ select: { amount: true, status: true } }),
    prisma.grantStage.count({
      where: { status: "Pending", dueDate: { lt: now } },
    }),
  ]);

  const total = grants.length;
  const open = grants.filter((g) => g.status === "Open").length;
  const totalAmount = grants.reduce((sum, g) => sum + g.amount, 0);
  const openAmount = grants
    .filter((g) => g.status === "Open")
    .reduce((sum, g) => sum + g.amount, 0);

  return {
    totalGrants: total,
    openGrants: open,
    closedGrants: total - open,
    totalAmount,
    openAmount,
    overdueStages,
  };
}
