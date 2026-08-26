import { prisma } from "@/lib/prisma";
import {
  buildEmailTemplate,
  sendEmail,
  type EmailTemplateKind,
} from "./email";

export type NotifyChannel = "email" | "inapp" | "both";

export async function notify(params: {
  recipientId: string;
  recipientEmail: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  channel: NotifyChannel;
  emailKind?: EmailTemplateKind;
  reference?: string;
}): Promise<void> {
  try {
    if (params.channel === "inapp" || params.channel === "both") {
      await prisma.notification.create({
        data: {
          recipientId: params.recipientId,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        },
      });
    }

    if (params.channel === "email" || params.channel === "both") {
      const kind = params.emailKind ?? "approval_needed";
      const template = buildEmailTemplate(kind, {
        title: params.title,
        link: params.link,
        reference: params.reference,
      });
      await sendEmail({
        to: params.recipientEmail,
        subject: template.subject,
        html: template.html,
      });
    }
  } catch (error) {
    console.error("[notifications] notify failed — continuing workflow", error);
  }
}

/** Legacy helper — resolves manager by email then notifies. */
export async function notifyManager(params: {
  managerEmail: string;
  requestTitle: string;
  approvalUrl: string;
}): Promise<void> {
  try {
    const manager = await prisma.commEmployee.findFirst({
      where: { email: params.managerEmail, isActive: true },
    });

    if (manager) {
      await notify({
        recipientId: manager.id,
        recipientEmail: manager.email,
        type: "approval_needed",
        title: "طلب جديد بانتظار موافقتك",
        body: `الطلب: ${params.requestTitle}`,
        link: params.approvalUrl,
        channel: "both",
        emailKind: "approval_needed",
      });
      return;
    }

    // No manager account matched — email-only fallback
    const template = buildEmailTemplate("approval_needed", {
      title: params.requestTitle,
      link: params.approvalUrl,
    });
    await sendEmail({
      to: params.managerEmail,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.error("[notifications] notifyManager failed", error);
  }
}

export async function notifySubmitter(params: {
  contactEmail: string;
  contactPhone: string;
  requestTitle: string;
  message: string;
  reference?: string;
}): Promise<void> {
  try {
    const template = buildEmailTemplate("completed", {
      title: params.requestTitle,
      reference: params.reference,
    });
    await sendEmail({
      to: params.contactEmail,
      subject: template.subject,
      html: template.html,
    });
    console.log("[notifications] submitter notified", {
      phone: params.contactPhone,
      message: params.message,
    });
  } catch (error) {
    console.error("[notifications] notifySubmitter failed", error);
  }
}
