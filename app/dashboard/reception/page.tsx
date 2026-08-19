import Link from "next/link";
import ModuleDisabled from "@/components/shared/module-disabled";
import { findModule } from "@/lib/modules/registry";
import { isModuleEnabled } from "@/lib/modules/server";
import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function ReceptionDashboardPage() {
  const enabled = await isModuleEnabled("reception");
  if (!enabled) {
    return <ModuleDisabled label={findModule("reception")?.label ?? "شاشة الاستقبال"} />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      receptionToken: true,
    },
    orderBy: { name: "asc" },
  });

  const visits = await prisma.communicationRequest.findMany({
    where: {
      visitDate: { gte: today, lt: tomorrow },
      approvedAt: { not: null },
      requestType: { requiresVisitDate: true },
      status: {
        in: [
          RequestStatus.Approved_Pending_Assignment,
          RequestStatus.In_Progress,
          RequestStatus.Completed,
        ],
      },
    },
    select: {
      id: true,
      title: true,
      contactPhone: true,
      contactEmail: true,
      visitAttended: true,
      department: { select: { name: true, receptionToken: true } },
      requestType: { select: { name: true } },
    },
    orderBy: { visitDate: "asc" },
  });

  const dateLabel = new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "full",
  }).format(today);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-primary">شاشة الاستقبال</h2>
        <p className="mt-1 text-sm text-brand-gray">
          زيارات اليوم ({dateLabel}) وروابط شاشات الاستقبال حسب القسم
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((dept) => (
          <article key={dept.id} className="card space-y-2 p-4">
            <h3 className="font-bold text-primary">{dept.name}</h3>
            {dept.receptionToken ? (
              <>
                <p className="break-all font-mono text-xs text-brand-gray" dir="ltr">
                  /reception/{dept.receptionToken}
                </p>
                <Link
                  href={`/reception/${dept.receptionToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-sm"
                >
                  فتح شاشة الاستقبال
                </Link>
              </>
            ) : (
              <p className="text-sm text-brand-gray">
                لا يوجد رمز استقبال — أضفه من الإعدادات → الأقسام
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="tmkeen-table">
          <thead>
            <tr>
              <th>الزيارة</th>
              <th>القسم</th>
              <th>النوع</th>
              <th>التواصل</th>
              <th>الحضور</th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-brand-gray">
                  لا توجد زيارات مجدولة اليوم
                </td>
              </tr>
            ) : (
              visits.map((v) => (
                <tr key={v.id}>
                  <td className="font-semibold">{v.title}</td>
                  <td>{v.department.name}</td>
                  <td>{v.requestType.name}</td>
                  <td dir="ltr" className="text-xs">
                    {v.contactPhone}
                    <br />
                    {v.contactEmail}
                  </td>
                  <td>
                    <span className={v.visitAttended ? "badge-success" : "badge-warning"}>
                      {v.visitAttended ? "حاضر" : "بانتظار"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-brand-gray">
        لتفعيل رمز لكل قسم: الإعدادات ← الأقسام ← حقل رمز الاستقبال.
      </p>
    </div>
  );
}
