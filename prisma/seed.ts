import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const employees = await prisma.commEmployee.createMany({
    data: [
      { name: "سارة العتيبي", email: "sara.comm@zaad.org" },
      { name: "محمد الشهري", email: "mohammed.comm@zaad.org" },
      { name: "نورة القحطاني", email: "noura.comm@zaad.org" },
    ],
    skipDuplicates: true,
  });

  const documents = await prisma.mediaDocument.createMany({
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
        description: "قالب Word لإصدار البيانات الصحفية",
        category: "templates",
        fileUrl: "https://example.com/docs/press-release-template.docx",
        sortOrder: 3,
      },
      {
        title: "سياسة النشر الإعلامي",
        description: "ضوابط النشر على المنصات الرسمية",
        category: "policies",
        fileUrl: "https://example.com/docs/media-policy.pdf",
        sortOrder: 4,
      },
      {
        title: "ألوان العلامة التجارية",
        description: "جدول الألوان الرسمية مع أكواد HEX",
        category: "brand",
        fileUrl: "https://example.com/docs/color-palette.pdf",
        sortOrder: 5,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded ${employees.count} employees, ${documents.count} documents`);
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
