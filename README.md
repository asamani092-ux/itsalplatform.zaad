# منصة قسم الاتصال المؤسسي — جمعية الزاد

منصة ديناميكية لإدارة طلبات التواصل المؤسسي مع مصادقة الموظفين، إعدادات قابلة للتكوين، ومساحات عمل منفصلة.

## المتطلبات

- Node.js 20+
- PostgreSQL 16

## الإعداد السريع

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

المنفذ: `http://localhost:3001`

### حسابات تجريبية (بعد seed)

| الدور | الهاتف | كلمة المرور |
|-------|--------|-------------|
| مدير | `0500000001` | `password123` |
| موظف | `0500000002` | `password123` |

رمز الاستقبال: `reception-demo-token` → `/reception/reception-demo-token`

## الواجهات

| المسار | الوصف |
|--------|-------|
| `/submit/[slug]` | نموذج تقديم ديناميكي |
| `/approve?token=` | موافقة المدير (magic link) |
| `/login` | تسجيل دخول الموظف/المدير |
| `/employee` | مساحة الموظف — التذاكر المسندة |
| `/manager` | لوحة KPI للمدير |
| `/manager/kanban` | Kanban |
| `/manager/team` | إدارة الفريق |
| `/manager/settings` | الأقسام وأنواع الطلبات والتوجيه |
| `/reception/[token]` | شاشة الاستقبال |

## API

### عام (بدون مصادقة)

| Method | Endpoint |
|--------|----------|
| GET | `/api/public/departments` |
| GET | `/api/public/request-types?departmentId=` |
| POST | `/api/public/requests` |

### مصادقة

| Method | Endpoint |
|--------|----------|
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` |

### موظف (جلسة)

| Method | Endpoint |
|--------|----------|
| GET | `/api/employee/tickets` |
| GET | `/api/employee/tickets/:id` |
| POST | `/api/employee/tickets/:id/complete` (multipart: proof) |

### مدير (جلسة MANAGER)

| Method | Endpoint |
|--------|----------|
| GET | `/api/manager/kpis` |
| GET/POST/PATCH | `/api/manager/team` |
| GET/POST/PATCH | `/api/manager/settings/departments` |
| GET/POST/PATCH | `/api/manager/settings/request-types` |
| GET/POST/PATCH | `/api/manager/settings/routing-rules` |
| GET | `/api/manager/tickets` |
| POST | `/api/manager/tickets/:id/assign` |
| POST | `/api/manager/tickets/:id/reassign` |
| PATCH | `/api/manager/tickets/:id/status` |

### أخرى

| Method | Endpoint |
|--------|----------|
| GET/PATCH | `/api/reception/[token]` |
| POST | `/api/uploads` |
| GET/POST | `/api/approve?token=` |

المسارات القديمة (`/api/requests`, `/api/dashboard/*`) ما زالت تعمل كـ thin wrappers.

## سير العمل

```
Pending_Manager → Approved_Pending_Assignment → In_Progress → Completed → Archived
```

عند الموافقة: إذا وُجدت قاعدة توجيه → إسناد تلقائي إلى `In_Progress`.

## SLA

- `createdAt` → `approvedAt` → `assignedAt` → `completedAt`

## الترخيص

للاستخدام الداخلي لجمعية الزاد.
