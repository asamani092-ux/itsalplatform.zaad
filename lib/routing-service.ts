import { prisma } from "./prisma";

export async function resolveAssignee(requestTypeId: string) {
  const rule = await prisma.routingRule.findFirst({
    where: {
      requestTypeId,
      isActive: true,
      employee: { isActive: true },
    },
    include: {
      employee: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return rule?.employee ?? null;
}

export async function listRoutingRules(requestTypeId?: string) {
  return prisma.routingRule.findMany({
    where: {
      isActive: true,
      ...(requestTypeId ? { requestTypeId } : {}),
    },
    include: {
      requestType: { select: { id: true, name: true, slug: true } },
      employee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
