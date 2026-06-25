# منصة قسم الاتصال المؤسسي — جمعية الزاد

بوابة MVP لإدارة طلبات التواصل المؤسسي، الحجوزات، ومركز الوثائق الإعلامية.

## المتطلبات

- Node.js 20+
- Docker (لـ PostgreSQL محلياً)

## الإعداد السريع

```bash
# 1) نسخ متغيرات البيئة
cp .env.example .env

# 2) تشغيل قاعدة البيانات
docker compose up -d

# 3) تثبيت الاعتماديات
npm install

# 4) تطبيق الهجرات والبذور
npx prisma migrate dev --name init
npm run db:seed

# 5) تشغيل الخادم
npm run dev
```

المنفذ الافتراضي: `http://localhost:3001`

## نظام التصميم

مدمج من `design-system/` (Tajawal، RTL، ألوان جمعية الزاد).

```ts
// tailwind.config.ts
import tmkeenPreset from "./design-system/tailwind.preset";
```

## واجهات API

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/requests` | تقديم طلب جديد + إرسال رابط موافقة للمدير |
| GET/POST | `/api/approve` | موافقة المدير عبر `token` |
| GET | `/api/dashboard/requests` | قائمة الطلبات (`view=active\|archive\|all`) |
| GET | `/api/dashboard/requests/:id` | تفاصيل طلب |
| POST | `/api/dashboard/requests/:id/assign` | إسناد لموظف |
| POST | `/api/dashboard/requests/:id/reassign` | إعادة إسناد |
| PATCH | `/api/dashboard/requests/:id/status` | تحديث الحالة |
| GET/POST | `/api/employees` | موظفو قسم الاتصال |
| GET/POST | `/api/hospitality/bookings` | حجوزات القاعات |
| GET/POST | `/api/media/documents` | مركز الوثائق |

## سير العمل

```
Pending_Manager → Approved_Pending_Assignment → In_Progress → Completed → Archived
```

## SLA Timestamps

- `createdAt` — وقت الإنشاء
- `managerApprovedAt` — موافقة المدير
- `assignedAt` — الإسناد
- `completedAt` — الإكمال

## مثال: تقديم طلب

```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "title": "تصميم بوستر فعالية",
    "description": "بوستر لفعالية التمكين السنوية",
    "requiredDate": "2026-07-15",
    "contactEmail": "user@example.com",
    "contactPhone": "+966500000000",
    "managerEmail": "manager@example.com"
  }'
```

## الترخيص

للاستخدام الداخلي لجمعية الزاد والمشاريع التابعة.
