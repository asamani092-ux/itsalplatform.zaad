import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const employees = await prisma.commEmployee.createMany({
    data: [
      {
        name: "سارة العتيبي",
        email: "sara.comm@zaad.org",
      },
      {
        name: "محمد الحربي",
        email: "mohammed.comm@zaad.org",
      },
      {
        name: "نورة القحطاني",
        email: "noura.comm@zaad.org",
      },
    ],
    skipDuplicates: true,
  });

  const documents = await prisma.mediaDocument.createMany({
    data: [
      {
        title: "دليل الهوية البصرية",
        description: "إرشادات استخدام الشعار والألوان الرسمية",
        category: "brand",
        fileUrl: "https://example.com/media/brand-guidelines.pdf",
        sortOrder: 1,
      },
      {
        title: "شعار جمعية الزاد — ملون",
        description: "ملف PNG عالي الدقة",
        category: "logos",
        fileUrl: "https://example.com/media/logo-color.png",
        sortOrder: 1,
      },
      {
        title: "شعار جمعية الزاد — أبيض",
        description: "للخلفيات الداكنة",
        category: "logos",
        fileUrl: "https://example.com/media/logo-white.png",
        sortOrder: 2,
      },
      {
        title: "نموذج طلب تصميم",
        description: "نموذج PDF لطلبات التصميم",
        category: "templates",
        fileUrl: "https://example.com/media/design-request-template.pdf",
        sortOrder: 1,
      },
      {
        title: "سياسة النشر الإعلامي",
        description: "إرشادات النشر على المنصات الرسمية",
        category: "policies",
        fileUrl: "https://example.com/media/media-policy.pdf",
        sortOrder: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded ${employees.count} employees`);
  console.log(`Seeded ${documents.count} media documents`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
