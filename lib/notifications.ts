interface NotifyManagerParams {
  managerEmail: string;
  requestTitle: string;
  approvalUrl: string;
}

interface NotifySubmitterParams {
  contactEmail: string;
  contactPhone: string;
  requestTitle: string;
  message: string;
}

export async function notifyManager(params: NotifyManagerParams): Promise<void> {
  console.log("[MOCK EMAIL → Manager]", {
    to: params.managerEmail,
    subject: `طلب موافقة: ${params.requestTitle}`,
    body: `يرجى الموافقة عبر الرابط: ${params.approvalUrl}`,
  });
}

export async function notifySubmitter(params: NotifySubmitterParams): Promise<void> {
  console.log("[MOCK NOTIFY → Submitter]", {
    email: params.contactEmail,
    phone: params.contactPhone,
    subject: `تحديث طلبك: ${params.requestTitle}`,
    body: params.message,
  });
}
