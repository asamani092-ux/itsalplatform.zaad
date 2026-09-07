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

export async function listOverdueGrantStages() {
  const now = new Date();
  const rows = await prisma.grantStage.findMany({
    where: {
      status: "Pending",
      dueDate: { lt: now },
      grant: { status: "Open" },
    },
    select: {
      id: true,
      label: true,
      amount: true,
      dueDate: true,
      index: true,
      grant: { select: { id: true, title: true, donorName: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  return rows.map((s: {
    id: string;
    label: string;
    amount: number | null;
    dueDate: Date | null;
    index: number;
    grant: { id: string; title: string; donorName: string };
  }) => ({
    stageId: s.id,
    label: s.label,
    index: s.index,
    amount: s.amount,
    dueDate: s.dueDate,
    grantId: s.grant.id,
    grantTitle: s.grant.title,
    donorName: s.grant.donorName,
  }));
}

export async function getGrantKpis() {
  const now = new Date();
  const [grants, overdueStages, overdueStagesList] = await Promise.all([
    prisma.grant.findMany({ select: { amount: true, status: true } }),
    prisma.grantStage.count({
      where: {
        status: "Pending",
        dueDate: { lt: now },
        grant: { status: "Open" },
      },
    }),
    listOverdueGrantStages(),
  ]);

  type GrantKpiRow = { amount: number; status: string };
  const rows: GrantKpiRow[] = grants;
  const total = rows.length;
  const open = rows.filter((g: GrantKpiRow) => g.status === "Open").length;
  const totalAmount = rows.reduce((sum: number, g: GrantKpiRow) => sum + g.amount, 0);
  const openAmount = rows
    .filter((g: GrantKpiRow) => g.status === "Open")
    .reduce((sum: number, g: GrantKpiRow) => sum + g.amount, 0);

  return {
    totalGrants: total,
    openGrants: open,
    closedGrants: total - open,
    totalAmount,
    openAmount,
    overdueStages,
    overdueStagesList,
  };
}
