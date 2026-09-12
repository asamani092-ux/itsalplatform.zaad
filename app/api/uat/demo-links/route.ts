import { jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@/generated/prisma/client";

/** Demo links for UAT — always available so evaluators can open approval journey. */
export async function GET() {
  try {
    const pending = await prisma.communicationRequest.findFirst({
      where: {
        status: RequestStatus.Pending_Manager,
        OR: [
          { approvalToken: "uat-demo-approval-token" },
          { contactEmail: { endsWith: "@demo.zaad.org" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        approvalToken: true,
        approvalTokenExpiresAt: true,
      },
    });

    if (!pending?.approvalToken) {
      return jsonError(
        "لا يوجد طلب تجريبي بانتظار الموافقة — أعد تشغيل البذرة أو قدّم طلباً من /request",
        "NOT_FOUND",
        404,
      );
    }

    return jsonOk({
      requestId: pending.id,
      title: pending.title,
      status: pending.status,
      approvalPath: `/approve?token=${pending.approvalToken}`,
      expiresAt: pending.approvalTokenExpiresAt,
      publicFormPath: "/request",
      loginPath: "/",
      uatPath: "/uat",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "تعذّر جلب روابط التجربة",
      "INTERNAL_ERROR",
      500,
    );
  }
}
