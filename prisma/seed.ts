import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../lib/auth-service";
import { EmployeeRole } from "../generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hashPassword("password123");

  await prisma.department.upsert({
    where: { slug: "communications" },
    update: {},
    create: {
      name: "قسم الاتصال المؤسسي",
      slug: "communications",
      managerEmail: "manager@zaad.org",
      receptionToken: "reception-demo-token",
    },
  });

  await prisma.department.upsert({
    where: { slug: "general" },
    update: {},
    create: {
      id: "dept_default",
      name: "قسم عام",
      slug: "general",
      managerEmail: "manager@zaad.org",
      receptionToken: "reception-default-token",
    },
  });

  const commDept = await prisma.department.findUnique({
    where: { slug: "communications" },
  });

  const requestTypes = [
    {
      slug: "press-release",
      name: "بيان صحفي",
      description: "طلب إصدار بيان صحفي",
      requiresVisitDate: false,
      departmentId: commDept?.id,
    },
    {
      slug: "media-coverage",
      name: "تغطية إعلامية",
      description: "طلب تغطية فعالية أو نشاط",
      requiresVisitDate: true,
      departmentId: commDept?.id,
    },
    {
      slug: "general-request",
      name: "طلب عام",
      description: "نوع طلب افتراضي",
      requiresVisitDate: false,
      departmentId: commDept?.id,
    },
  ];

  for (const rt of requestTypes) {
    await prisma.requestType.upsert({
      where: { slug: rt.slug },
      update: {},
      create: rt,
    });
  }

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

  const pressType = await prisma.requestType.findUnique({
    where: { slug: "press-release" },
  });
  const coverageType = await prisma.requestType.findUnique({
    where: { slug: "media-coverage" },
  });

  if (pressType && createdEmployees[0]) {
    await prisma.routingRule.upsert({
      where: {
        requestTypeId_employeeId: {
          requestTypeId: pressType.id,
          employeeId: createdEmployees[0].id,
        },
      },
      update: { isActive: true },
      create: {
        requestTypeId: pressType.id,
        employeeId: createdEmployees[0].id,
      },
    });
  }

  if (coverageType && createdEmployees[1]) {
    await prisma.routingRule.upsert({
      where: {
        requestTypeId_employeeId: {
          requestTypeId: coverageType.id,
          employeeId: createdEmployees[1].id,
        },
      },
      update: { isActive: true },
      create: {
        requestTypeId: coverageType.id,
        employeeId: createdEmployees[1].id,
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
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete:");
  console.log(`  Manager: ${manager.phoneNumber} / password123`);
  console.log(`  Employees: password123 for all`);
  console.log(`  Reception token: reception-demo-token`);
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
