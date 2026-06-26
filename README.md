# منصة قسم الاتصال المؤسسي — جمعية الزاد

MVP Backend لإدارة طلبات التواصل المؤسسي، الحجوزات، ومركز الوثائق الإعلامية.

> الواجهة لم تُبنَ بعد — المشروع حالياً API + نظام تصميم الزاد.

## المتطلبات

- Node.js 20+
- PostgreSQL 16 (عبر Docker **أو** تثبيت محلي)

## الإعداد

### الخيار أ — Docker

```bash
cp .env.example .env
# استخدم منفذ 5433 مع Docker (افتراضي في التعليقات داخل .env.example)
bash scripts/docker-up.sh
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

**إذا ظهر `permission denied` على `docker.sock`:**

```bash
sudo service docker start
sudo chmod 666 /var/run/docker.sock
docker compose up -d
```

أو أعد فتح الطرفية بعد إضافتك لمجموعة `docker`، أو نفّذ: `newgrp docker`

### الخيار ب — PostgreSQL محلي (بدون Docker)

```bash
# Ubuntu/Debian
sudo apt-get install -y postgresql postgresql-contrib
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER itsal WITH PASSWORD 'itsal_dev';" \
  -c "CREATE DATABASE itsalplatform OWNER itsal;"

cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

> `.env.example` الافتراضي يستخدم المنفذ **5432** (PostgreSQL محلي).

المنفذ: `http://localhost:3001`

## نظام التصميم

مدمج من `design-system/` — راجع `design-system/README.md`.

## واجهات API

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/requests` | تقديم طلب + token موافقة + إشعار mock للمدير |
| GET/POST | `/api/approve?token=` | موافقة المدير بدون تسجيل دخول |
| GET | `/api/dashboard/requests` | قائمة (`view=active\|archive\|all`) |
| GET | `/api/dashboard/requests/:id` | تفاصيل + SLA |
| POST | `/api/dashboard/requests/:id/assign` | إسناد → `In_Progress` |
| POST | `/api/dashboard/requests/:id/reassign` | إعادة إسناد |
| PATCH | `/api/dashboard/requests/:id/status` | `Completed` / `Archived` |
| GET/POST | `/api/employees` | موظفو القسم |
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
