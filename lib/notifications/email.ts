import nodemailer from "nodemailer";

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
}

function wrapArabicEmail(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string): string {
  const button =
    ctaLabel && ctaUrl
      ? `<p style="margin:24px 0;text-align:center">
          <a href="${ctaUrl}" style="background:#8B1538;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">${ctaLabel}</a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #E8E8E8;border-radius:12px;overflow:hidden">
    <div style="background:#8B1538;color:#fff;padding:16px 20px">
      <div style="font-size:18px;font-weight:800">جمعية الزاد</div>
      <div style="font-size:12px;color:#F2B824;margin-top:4px">قسم الاتصال المؤسسي</div>
    </div>
    <div style="padding:24px 20px;color:#706F6F">
      <h1 style="color:#8B1538;font-size:18px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
      ${button}
    </div>
    <div style="padding:12px 20px;background:#F5F5F5;color:#706F6F;font-size:11px;border-top:1px solid #E8E8E8">
      هذه رسالة آلية من منصة قسم الاتصال المؤسسي — جمعية الزاد
    </div>
  </div>
</body>
</html>`;
}

export type EmailTemplateKind =
  | "approval_needed"
  | "submitted"
  | "approved"
  | "in_progress"
  | "assigned"
  | "completed"
  | "rejected"
  | "pending_review"
  | "returned"
  | "reassignment_request";

export function buildEmailTemplate(
  kind: EmailTemplateKind,
  data: {
    title: string;
    link?: string;
    reference?: string;
    note?: string;
    reason?: string;
  },
): { subject: string; html: string } {
  const rejectionText = data.reason ?? data.note;

  if (kind === "approval_needed") {
    return {
      subject: "طلب جديد بانتظار موافقتك",
      html: wrapArabicEmail(
        "طلب جديد بانتظار موافقتك",
        `<p>يوجد طلب جديد بعنوان: <strong style="color:#8B1538">${data.title}</strong></p>
         <p>يرجى مراجعة الطلب والموافقة عبر الرابط أدناه.</p>`,
        "فتح رابط الموافقة",
        data.link,
      ),
    };
  }

  if (kind === "submitted") {
    return {
      subject: "تم استلام طلبك",
      html: wrapArabicEmail(
        "تم استلام طلبك",
        `<p>تم استلام طلبك: <strong style="color:#8B1538">${data.title}</strong> بنجاح.</p>
         <p>الرقم المرجعي: <span dir="ltr">${data.reference ?? "—"}</span></p>
         <p>سيتم إشعارك عند اعتماده وبدء العمل عليه.</p>`,
      ),
    };
  }

  if (kind === "approved") {
    return {
      subject: "تمت الموافقة على طلبك",
      html: wrapArabicEmail(
        "تمت الموافقة على طلبك",
        `<p>وافق المدير المباشر على طلبك: <strong style="color:#8B1538">${data.title}</strong>.</p>
         <p>الرقم المرجعي: <span dir="ltr">${data.reference ?? "—"}</span></p>
         <p>سيتم إسناده للتنفيذ قريباً وإشعارك عند بدء العمل.</p>`,
      ),
    };
  }

  if (kind === "in_progress") {
    return {
      subject: "بدأ العمل على طلبك",
      html: wrapArabicEmail(
        "بدأ العمل على طلبك",
        `<p>بدأ فريق قسم الاتصال المؤسسي العمل على طلبك: <strong style="color:#8B1538">${data.title}</strong>.</p>
         <p>الرقم المرجعي: <span dir="ltr">${data.reference ?? "—"}</span></p>
         <p>سيتم إشعارك عند اكتمال التنفيذ.</p>`,
      ),
    };
  }

  if (kind === "assigned") {
    return {
      subject: "تم إسناد تذكرة جديدة إليك",
      html: wrapArabicEmail(
        "تم إسناد تذكرة جديدة إليك",
        `<p>تم إسناد الطلب: <strong style="color:#8B1538">${data.title}</strong> إليك.</p>
         <p>يمكنك متابعة التذكرة من مساحة الموظف.</p>`,
        "فتح التذكرة",
        data.link,
      ),
    };
  }

  if (kind === "rejected") {
    const reasonHtml = rejectionText
      ? `<p><strong>سبب الرفض:</strong></p><p style="background:#F5F5F5;padding:12px;border-radius:8px">${rejectionText}</p>`
      : "";
    return {
      subject: "تم رفض طلبك",
      html: wrapArabicEmail(
        "تم رفض طلبك",
        `<p>نأسف لإبلاغك برفض الطلب: <strong style="color:#8B1538">${data.title}</strong>.</p>
         <p>الرقم المرجعي: <span dir="ltr">${data.reference ?? "—"}</span></p>
         ${reasonHtml}
         <p>للاستفسار يرجى التواصل مع قسم الاتصال المؤسسي.</p>`,
      ),
    };
  }

  if (kind === "pending_review") {
    return {
      subject: "تذكرة بانتظار مراجعتك",
      html: wrapArabicEmail(
        "تذكرة بانتظار مراجعتك",
        `<p>أعلن الموظف انتهاء العمل على: <strong style="color:#8B1538">${data.title}</strong>.</p>
         <p>يرجى اعتماد الإكمال أو إرجاع التذكرة.</p>`,
        "فتح لوحة العمل",
        data.link,
      ),
    };
  }

  if (kind === "returned") {
    return {
      subject: "أُعيدت التذكرة إليك",
      html: wrapArabicEmail(
        "أُعيدت التذكرة إليك",
        `<p>أُعيدت التذكرة: <strong style="color:#8B1538">${data.title}</strong> للمراجعة والتصحيح.</p>
         ${rejectionText ? `<p>ملاحظة المدير: ${rejectionText}</p>` : ""}`,
        "فتح التذكرة",
        data.link,
      ),
    };
  }

  if (kind === "reassignment_request") {
    return {
      subject: "رفض إسناد / طلب إعادة إسناد",
      html: wrapArabicEmail(
        "رفض إسناد / طلب إعادة إسناد",
        `<p>رفض الموظف التذكرة: <strong style="color:#8B1538">${data.title}</strong> وطلب إعادة الإسناد.</p>
         ${rejectionText ? `<p>ملاحظة الموظف: ${rejectionText}</p>` : ""}`,
        "فتح لوحة العمل",
        data.link,
      ),
    };
  }

  return {
    subject: "تم إكمال طلبك",
    html: wrapArabicEmail(
      "تم إكمال طلبك",
      `<p>تم إكمال طلبك: <strong style="color:#8B1538">${data.title}</strong>.</p>
       <p>الرقم المرجعي: <span dir="ltr">${data.reference ?? "—"}</span></p>
       <p>شكراً لتواصلك مع قسم الاتصال المؤسسي.</p>`,
    ),
  };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!smtpConfigured()) {
    console.warn(
      "[notifications/email] SMTP vars missing — skipping email send",
      { to: params.to, subject: params.subject },
    );
    console.log("[notifications/email MOCK]", {
      to: params.to,
      subject: params.subject,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
