import { RequestStatus } from "@/generated/prisma/client";

export type NotificationPayload = {
  to: string;
  subject: string;
  body: string;
  channel?: "email" | "whatsapp";
};

function logMockNotification(payload: NotificationPayload) {
  console.log("[MOCK NOTIFICATION]", {
    channel: payload.channel ?? "email",
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
  });
}

export async function NotifyManager(params: {
  managerEmail: string;
  requestTitle: string;
  approvalUrl: string;
}): Promise<void> {
  logMockNotification({
    to: params.managerEmail,
    subject: `طلب موافقة: ${params.requestTitle}`,
    body: `يرجى مراجعة الطلب والموافقة عبر الرابط:\n${params.approvalUrl}`,
    channel: "email",
  });
}

export async function NotifySubmitter(params: {
  contactEmail: string;
  contactPhone: string;
  requestTitle: string;
  status: RequestStatus;
}): Promise<void> {
  logMockNotification({
    to: params.contactEmail,
    subject: `تحديث حالة الطلب: ${params.requestTitle}`,
    body: `تم تحديث حالة طلبك إلى: ${params.status}`,
    channel: "email",
  });

  logMockNotification({
    to: params.contactPhone,
    subject: `تحديث الطلب`,
    body: `طلب "${params.requestTitle}" — الحالة: ${params.status}`,
    channel: "whatsapp",
  });
}
