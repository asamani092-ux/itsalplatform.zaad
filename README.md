# منصة قسم الاتصال المؤسسي — جمعية الزاد

منصة Next.js لإدارة طلبات التواصل المؤسسي: نموذج تقديم عام، موافقة المدير عبر رابط، لوحة Kanban، مساحة موظف، إعدادات ديناميكية، واستقبال الزيارات.

## المعمارية

| الطبقة | التقنية |
|--------|---------|
| Framework | Next.js 15 (App Router) + React 18 |
| UI | Tailwind CSS + [Tmkeen Design System](./Design_system_f/uploads/design-system/README.md) (RTL، Tajawal، `.btn-primary` / `.card` / …) |
| ORM | Prisma 7 + PostgreSQL 16 |
| Auth | JWT في cookie `zaad_session` (jose + bcrypt) |
| Port | `3001` |

```
[عام]  /  → نموذج تقديم
         /approve?token=  → موافقة المدير (magic link، 7 أيام)
[جلسة] /login  → MANAGER → /dashboard/*  |  EMPLOYEE → /employee/*
[API]  /api/public/*  /api/manager/*  /api/employee/*  (+ legacy wrappers محمية)
```

## الفروع

| الفرع | الوصف |
|-------|-------|
| `main` | خط الأساس — design system |
| `cursor/zaad-portal-architecture-f122` | **الفرع النشط** — معمارية كاملة + UI Phase 1 + Security Phase 1 |

## نظام التصميم (@zaad/design-system)

المصدر الوحيد: الحزمة `@zaad/design-system` من `asamani092-ux/designSystemFinal` (الإصدار المثبّت في `package.json`).

- `tokens.css` + `components.css` عبر `app/globals.css`
- Tailwind preset: `@zaad/design-system/tailwind.preset`
- الجذر: `lang="ar" dir="rtl"` و `class="zad-root"`
- عقود المكوّنات: `node_modules/@zaad/design-system/components.md`

## المتطلبات

- Node.js ≥ 20
- PostgreSQL 16 (Docker **أو** تثبيت محلي)

## متغيرات البيئة

انسخ `.env.example` إلى `.env`:

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `DATABASE_URL` | نعم | اتصال PostgreSQL |
| `NEXT_PUBLIC_APP_URL` | نعم | URL التطبيق (مثال: `http://localhost:3001`) |
| `SESSION_SECRET` | **إلزامي في production** | توقيع JWT — أنشئه: `openssl rand -base64 48` |
| `SMTP_*` | Phase 5 | placeholders في `.env.example` — حالياً الإشعارات mock في console |

> في `NODE_ENV=production` يفشل التشغيل إذا كان `SESSION_SECRET` غير مضبوط أو يساوي القيمة الافتراضية للتطوير.

## الإعداد

### Docker (PostgreSQL على المنفذ 5433)

```bash
cp .env.example .env
bash scripts/docker-up.sh
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

إذا ظهر `permission denied` على `docker.sock`:

```bash
sudo service docker start
sudo chmod 666 /var/run/docker.sock
```

### PostgreSQL محلي (منفذ 5432)

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER itsal WITH PASSWORD 'itsal_dev';" \
  -c "CREATE DATABASE itsalplatform OWNER itsal;"

cp .env.example .env
# فعّل سطر DATABASE_URL للمنفذ 5432
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## أوامر التشغيل

```bash
npm run dev          # تطوير — http://localhost:3001
npm run build        # بناء production (يتطلب DATABASE_URL + DB يعمل لـ prerender)
npm run start        # تشغيل بعد build
npm run db:seed      # بيانات تجريبية
npx tsc --noEmit     # فحص TypeScript
```

## حسابات تجريبية (بعد seed)

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| مدير | `manager@zaad.org` | `password123` |
| موظف | `sara.comm@zaad.org` | `password123` |

رمز الاستقبال: `reception-demo-token` → `/reception/reception-demo-token`

## الواجهات

| المسار | الوصف |
|--------|-------|
| `/` | تسجيل الدخول |
| `/approve?token=` | موافقة المدير |
| `/login` | إعادة توجيه إلى `/` |
| `/dashboard` | KPIs (مدير) |
| `/dashboard/kanban` | Kanban |
| `/dashboard/team` | الفريق |
| `/dashboard/settings` | الإعدادات |
| `/employee` | تذاكر الموظف |
| `/reception/[token]` | شاشة الاستقبال |
| `/manager/*` | redirects → `/dashboard/*` |

## API (ملخص)

### عام (بدون جلسة)

| Method | Endpoint |
|--------|----------|
| GET | `/api/public/departments`, `/api/public/request-types` |
| POST | `/api/public/requests`, `/api/requests` (legacy) |
| GET/POST | `/api/approve?token=` |
| GET/PATCH | `/api/reception/[token]` |
| GET | `/api/health`, `/ping` |

### مصادقة

| Method | Endpoint |
|--------|----------|
| POST | `/api/auth/login` (5 محاولات/دقيقة/IP) |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` |

### موظف / مدير

| Method | Endpoint |
|--------|----------|
| GET | `/api/employee/tickets`, `/api/employee/tickets/:id` |
| POST | `/api/employee/tickets/:id/complete` |
| GET | `/api/manager/kpis`, `/api/manager/tickets` |
| POST | `/api/manager/tickets/:id/assign`, `reassign`, `resend-approval` |
| PATCH | `/api/manager/tickets/:id/status` |
| GET/POST/PATCH | `/api/manager/team`, `/api/manager/settings/*` |

### Legacy (محمية — MANAGER فقط)

`/api/dashboard/*`, `/api/employees`, `/api/hospitality/bookings`, `/api/media/documents`

## سير العمل

```
Pending_Manager → Approved_Pending_Assignment → In_Progress → Completed → Archived
```

- رابط الموافقة صالح **7 أيام** (`approvalTokenExpiresAt`)
- عند الموافقة: إسناد تلقائي إذا وُجدت قاعدة توجيه
- SLA: `createdAt` → `approvedAt` → `assignedAt` → `completedAt`

## الأمان (Phase 1)

- JWT موقّع في middleware (jose)
- Rate limiting في الذاكرة (login 5/min، requests/uploads 10/min)
- رفع ملفات: magic bytes + UUID filenames
- `SESSION_SECRET` إلزامي في production

## الترخيص

للاستخدام الداخلي لجمعية الزاد والمشاريع التابعة.
