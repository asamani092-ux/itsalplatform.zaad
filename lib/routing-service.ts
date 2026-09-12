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

export async function listRoutingRules(options?: {
  requestTypeId?: string;
  includeInactive?: boolean;
}) {
  return prisma.routingRule.findMany({
    where: {
      ...(options?.includeInactive ? {} : { isActive: true }),
      ...(options?.requestTypeId ? { requestTypeId: options.requestTypeId } : {}),
    },
    include: {
      requestType: { select: { id: true, name: true, slug: true } },
      employee: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ requestType: { name: "asc" } }, { createdAt: "asc" }],
  });
}
