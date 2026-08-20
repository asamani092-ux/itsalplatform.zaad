import "dotenv/config";
import { PrismaClient, EmployeeRole, RequestStatus } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../lib/auth-service";
import { generateApprovalToken } from "../lib/tokens";
import { PLATFORM_MODULES } from "../lib/modules/registry";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function daysFromNow(d: number) {
  const x = new Date();
  x.setHours(10, 0, 0, 0);
  x.setDate(x.getDate() + d);
  return x;
}

async function main() {
  const passwordHash = await hashPassword("password123");

  await prisma.department.upsert({
    where: { slug: "communications" },
    update: { receptionToken: "reception-demo-token", isActive: true },
    create: {
      name: "قسم الاتصال المؤسسي",
      slug: "communications",
      managerEmail: "manager@zaad.org",
      receptionToken: "reception-demo-token",
    },
  });

  await prisma.department.upsert({
    where: { slug: "general" },
    update: { receptionToken: "reception-default-token", isActive: true },
    create: {
      id: "dept_default",
      name: "قسم عام",
      slug: "general",
      managerEmail: "manager@zaad.org",
      receptionToken: "reception-default-token",
    },
  });

  await prisma.department.upsert({
    where: { slug: "partnerships" },
    update: { receptionToken: "reception-partners-token", isActive: true },
    create: {
      name: "قسم الشراكات",
      slug: "partnerships",
      managerEmail: "manager@zaad.org",
      receptionToken: "reception-partners-token",
    },
  });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
  });
  const bySlug = Object.fromEntries(departments.map((d) => [d.slug, d]));

  const requestTypes = [
    {
      slug: "press-release",
      name: "بيان صحفي",
      description: "طلب إصدار بيان صحفي",
      requiresVisitDate: false,
      departmentId: bySlug.communications?.id,
    },
    {
      slug: "media-coverage",
      name: "تغطية إعلامية",
      description: "طلب تغطية فعالية أو نشاط",
      requiresVisitDate: true,
      departmentId: bySlug.communications?.id,
    },
    {
      slug: "general-request",
      name: "طلب عام",
      description: "نوع طلب افتراضي",
      requiresVisitDate: false,
      departmentId: bySlug.general?.id,
    },
    {
      slug: "partner-visit",
      name: "زيارة شريك",
      description: "زيارة رسمية من جهة شريكة",
      requiresVisitDate: true,
      departmentId: bySlug.partnerships?.id,
    },
  ];

  for (const rt of requestTypes) {
    await prisma.requestType.upsert({
      where: { slug: rt.slug },
      update: {
        requiresVisitDate: rt.requiresVisitDate,
        departmentId: rt.departmentId,
        isActive: true,
      },
      create: rt,
    });
  }

  const types = await prisma.requestType.findMany();
  const typeBySlug = Object.fromEntries(types.map((t) => [t.slug, t]));

  const manager = await prisma.commEmployee.upsert({
    where: { email: "manager@zaad.org" },
    update: {
      phoneNumber: "0500000001",
      passwordHash,
      role: EmployeeRole.MANAGER,
      isActive: true,
    },
    create: {
      name: "مدير الاتصال",
      email: "manager@zaad.org",
      phoneNumber: "0500000001",
      passwordHash,
      role: EmployeeRole.MANAGER,
    },
  });

  const employees = [
    { name: "سارة العتيبي", email: "sara.comm@zaad.org", phone: "0500000002" },
    { name: "محمد الشهري", email: "mohammed.comm@zaad.org", phone: "0500000003" },
    { name: "نورة القحطاني", email: "noura.comm@zaad.org", phone: "0500000004" },
  ];

  const createdEmployees = [];
  for (const emp of employees) {
    const row = await prisma.commEmployee.upsert({
      where: { email: emp.email },
      update: {
        phoneNumber: emp.phone,
        passwordHash,
        role: EmployeeRole.EMPLOYEE,
        isActive: true,
      },
      create: {
        name: emp.name,
        email: emp.email,
        phoneNumber: emp.phone,
        passwordHash,
        role: EmployeeRole.EMPLOYEE,
      },
    });
    createdEmployees.push(row);
  }

  const receptionist = await prisma.commEmployee.upsert({
    where: { email: "reception@zaad.org" },
    update: {
      phoneNumber: "0500000005",
      passwordHash,
      role: EmployeeRole.RECEPTION,
      isActive: true,
    },
    create: {
      name: "موظف الاستقبال",
      email: "reception@zaad.org",
      phoneNumber: "0500000005",
      passwordHash,
      role: EmployeeRole.RECEPTION,
    },
  });

  if (typeBySlug["press-release"] && createdEmployees[0]) {
    await prisma.routingRule.upsert({
      where: {
        requestTypeId_employeeId: {
          requestTypeId: typeBySlug["press-release"].id,
          employeeId: createdEmployees[0].id,
        },
      },
      update: { isActive: true },
      create: {
        requestTypeId: typeBySlug["press-release"].id,
        employeeId: createdEmployees[0].id,
      },
    });
  }

  if (typeBySlug["media-coverage"] && createdEmployees[1]) {
    await prisma.routingRule.upsert({
      where: {
        requestTypeId_employeeId: {
          requestTypeId: typeBySlug["media-coverage"].id,
          employeeId: createdEmployees[1].id,
        },
      },
      update: { isActive: true },
      create: {
        requestTypeId: typeBySlug["media-coverage"].id,
        employeeId: createdEmployees[1].id,
      },
    });
  }

  for (const mod of PLATFORM_MODULES) {
    await prisma.platformModule.upsert({
      where: { key: mod.key },
      update: { isEnabled: true, sortOrder: mod.sortOrder },
      create: {
        key: mod.key,
        isEnabled: true,
        sortOrder: mod.sortOrder,
      },
    });
  }

  // Wipe prior demo-tagged requests/logs so re-seed stays deterministic (cumulative history
  // for real use; demo seed replaces its own markers only).
  await prisma.receptionVisitorLog.deleteMany({
    where: { visitorPhone: { startsWith: "0599" } },
  });
  await prisma.hospitalityBooking.deleteMany({
    where: { requesterEmail: { endsWith: "@demo.zaad.org" } },
  });
  await prisma.communicationRequest.deleteMany({
    where: { contactEmail: { endsWith: "@demo.zaad.org" } },
  });

  const sara = createdEmployees[0];
  const mohammed = createdEmployees[1];

  const demoRequests = [
    {
      title: "بيان إطلاق حملة التطوع",
      description: "صياغة بيان صحفي لحملة التطوع الربيعية",
      contactEmail: "fatima@demo.zaad.org",
      contactPhone: "0551000001",
      departmentId: bySlug.communications!.id,
      requestTypeId: typeBySlug["press-release"]!.id,
      status: RequestStatus.Pending_Manager,
      requiredDate: daysFromNow(5),
      visitDate: null as Date | null,
      visitAttended: null as boolean | null,
      approvedAt: null as Date | null,
      assignedEmployeeId: null as string | null,
      assignedAt: null as Date | null,
      completedAt: null as Date | null,
    },
    {
      title: "تغطية ملتقى المتطوعين",
      description: "تغطية إعلامية لملتقى المتطوعين في المقر",
      contactEmail: "ali@demo.zaad.org",
      contactPhone: "0551000002",
      departmentId: bySlug.communications!.id,
      requestTypeId: typeBySlug["media-coverage"]!.id,
      status: RequestStatus.Approved_Pending_Assignment,
      requiredDate: daysFromNow(2),
      visitDate: hoursFromNow(2),
      visitAttended: false,
      approvedAt: hoursFromNow(-20),
      assignedEmployeeId: null,
      assignedAt: null,
      completedAt: null,
    },
    {
      title: "زيارة وفد وزارة الإعلام",
      description: "استقبال وفد الوزارة للاطلاع على البرامج",
      contactEmail: "visit@demo.zaad.org",
      contactPhone: "0551000003",
      departmentId: bySlug.communications!.id,
      requestTypeId: typeBySlug["media-coverage"]!.id,
      status: RequestStatus.In_Progress,
      requiredDate: daysFromNow(1),
      visitDate: hoursFromNow(4),
      visitAttended: false,
      approvedAt: hoursFromNow(-10),
      assignedEmployeeId: mohammed?.id ?? null,
      assignedAt: hoursFromNow(-8),
      completedAt: null,
    },
    {
      title: "زيارة شريك — مؤسسة الإحسان",
      description: "اجتماع تنسيقي حول الشراكة المجتمعية",
      contactEmail: "partner@demo.zaad.org",
      contactPhone: "0551000004",
      departmentId: bySlug.partnerships!.id,
      requestTypeId: typeBySlug["partner-visit"]!.id,
      status: RequestStatus.In_Progress,
      requiredDate: daysFromNow(1),
      visitDate: hoursFromNow(1),
      visitAttended: false,
      approvedAt: hoursFromNow(-30),
      assignedEmployeeId: sara?.id ?? null,
      assignedAt: hoursFromNow(-25),
      completedAt: null,
    },
    {
      title: "طلب تصميم منشور توعوي",
      description: "تصميم منشور لوسائل التواصل",
      contactEmail: "design@demo.zaad.org",
      contactPhone: "0551000005",
      departmentId: bySlug.general!.id,
      requestTypeId: typeBySlug["general-request"]!.id,
      status: RequestStatus.Completed,
      requiredDate: daysFromNow(-2),
      visitDate: null,
      visitAttended: null,
      approvedAt: hoursFromNow(-72),
      assignedEmployeeId: sara?.id ?? null,
      assignedAt: hoursFromNow(-60),
      completedAt: hoursFromNow(-12),
    },
    {
      title: "زيارة صباحية — متبرع",
      description: "زيارة متبرع للاطلاع على المشاريع",
      contactEmail: "donor@demo.zaad.org",
      contactPhone: "0551000006",
      departmentId: bySlug.partnerships!.id,
      requestTypeId: typeBySlug["partner-visit"]!.id,
      status: RequestStatus.Completed,
      requiredDate: daysFromNow(0),
      visitDate: hoursFromNow(-3),
      visitAttended: true,
      approvedAt: hoursFromNow(-48),
      assignedEmployeeId: mohammed?.id ?? null,
      assignedAt: hoursFromNow(-40),
      completedAt: hoursFromNow(-2),
    },
  ];

  const createdRequestIds: string[] = [];
  for (const r of demoRequests) {
    const row = await prisma.communicationRequest.create({
      data: {
        title: r.title,
        description: r.description,
        contactEmail: r.contactEmail,
        contactPhone: r.contactPhone,
        managerEmail: "manager@zaad.org",
        departmentId: r.departmentId,
        requestTypeId: r.requestTypeId,
        status: r.status,
        requiredDate: r.requiredDate,
        visitDate: r.visitDate,
        visitAttended: r.visitAttended,
        visitMarkedAt: r.visitAttended ? hoursFromNow(-2) : null,
        approvedAt: r.approvedAt,
        assignedEmployeeId: r.assignedEmployeeId,
        assignedAt: r.assignedAt,
        completedAt: r.completedAt,
        approvalToken: generateApprovalToken(),
        approvalTokenExpiresAt: daysFromNow(7),
      },
    });
    createdRequestIds.push(row.id);

    await prisma.statusHistory.create({
      data: {
        requestId: row.id,
        fromStatus: null,
        toStatus: r.status,
        changedBy: manager.id,
        note: "بيانات تجريبية",
      },
    });
  }

  const attendedRequestId = createdRequestIds[5];
  await prisma.receptionVisitorLog.createMany({
    data: [
      {
        visitorName: "خالد الدوسري",
        visitorPhone: "0599000001",
        organization: "مؤسسة الخير",
        visitType: "تابع لجهة",
        visitTarget: "إدارة الإتصال المؤسسي",
        reason: "زيارة متبرع — الاطلاع على المشاريع",
        visitTimeSlot: "الصباح",
        visitAt: hoursFromNow(-3),
        departmentId: bySlug.partnerships!.id,
        requestId: attendedRequestId,
        markedById: receptionist.id,
      },
      {
        visitorName: "نورة السبيعي",
        visitorPhone: "0599000002",
        organization: "زائر مستقِل",
        visitType: "شخصي",
        visitTarget: "زائر - تسليم مستندات",
        reason: "تسليم مستندات",
        visitTimeSlot: "الظهر",
        visitAt: hoursFromNow(-1),
        departmentId: bySlug.communications!.id,
        markedById: receptionist.id,
      },
      {
        visitorName: "فهد العتيبي",
        visitorPhone: "0599000003",
        organization: "جهة حكومية",
        visitType: "تابع لجهة",
        visitTarget: "الإدارة التنفيذية",
        reason: "اجتماع تنسيقي",
        visitTimeSlot: "المساء",
        visitAt: hoursFromNow(-5),
        departmentId: bySlug.general!.id,
        markedById: receptionist.id,
      },
    ],
  });

  await prisma.hospitalityBooking.createMany({
    data: [
      {
        requesterName: "منى القحطاني",
        requesterEmail: "mona@demo.zaad.org",
        requesterPhone: "0552000001",
        roomName: "قاعة الاجتماعات الكبرى",
        meetingDate: daysFromNow(1),
        startTime: "10:00",
        endTime: "12:00",
        attendeesCount: 12,
        notes: "اجتماع لجنة الإعلام",
      },
      {
        requesterName: "سعد الحربي",
        requesterEmail: "saad@demo.zaad.org",
        requesterPhone: "0552000002",
        roomName: "قاعة التدريب",
        meetingDate: daysFromNow(3),
        startTime: "13:00",
        endTime: "15:30",
        attendeesCount: 20,
        notes: "ورشة تصوير",
      },
    ],
  });

  if (bySlug.communications && typeBySlug["press-release"]) {
    await prisma.requestForm.upsert({
      where: { slug: "press-public" },
      update: {
        isPublished: true,
        name: "نموذج بيان صحفي",
        departmentId: bySlug.communications.id,
        requestTypeId: typeBySlug["press-release"].id,
      },
      create: {
        slug: "press-public",
        name: "نموذج بيان صحفي",
        isPublished: true,
        isDefault: false,
        departmentId: bySlug.communications.id,
        requestTypeId: typeBySlug["press-release"].id,
        pageTitle: "طلب بيان صحفي",
        pageSubtitle: "جمعية الزاد",
        introText: "عبّئ النموذج لطلب إصدار بيان صحفي.",
        submitLabel: "إرسال الطلب",
      },
    });
  }

  if (bySlug.communications && typeBySlug["media-coverage"]) {
    await prisma.requestForm.upsert({
      where: { slug: "coverage-public" },
      update: {
        isPublished: true,
        name: "نموذج تغطية إعلامية",
        departmentId: bySlug.communications.id,
        requestTypeId: typeBySlug["media-coverage"].id,
      },
      create: {
        slug: "coverage-public",
        name: "نموذج تغطية إعلامية",
        isPublished: true,
        departmentId: bySlug.communications.id,
        requestTypeId: typeBySlug["media-coverage"].id,
        pageTitle: "طلب تغطية إعلامية",
        pageSubtitle: "جمعية الزاد",
        introText: "حدد موعد الزيارة ونوع التغطية المطلوبة.",
      },
    });
  }

  await prisma.mediaDocument.createMany({
    data: [
      {
        title: "دليل الهوية البصرية",
        description: "إرشادات استخدام شعار وخطوط جمعية الزاد",
        category: "brand",
        fileUrl: "https://example.com/docs/brand-guidelines.pdf",
        sortOrder: 1,
      },
      {
        title: "شعار الجمعية — PNG",
        description: "شعار رسمي بخلفية شفافة",
        category: "logos",
        fileUrl: "https://example.com/docs/zaad-logo.png",
        sortOrder: 2,
      },
      {
        title: "قالب بيان صحفي",
        description: "نموذج Word للبيانات الصحفية",
        category: "templates",
        fileUrl: "https://example.com/docs/press-template.docx",
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete:");
  console.log(`  Manager: ${manager.email} / password123`);
  console.log(`  Employees: password123 for all (email login)`);
  console.log(`  Reception desk: ${receptionist.email} / password123`);
  console.log(`  Demo requests: ${demoRequests.length}`);
  console.log(`  Visitor logs: 3 | Hospitality: 2 | Forms: 2`);
  console.log(`  Reception token (legacy kiosk): reception-demo-token`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
