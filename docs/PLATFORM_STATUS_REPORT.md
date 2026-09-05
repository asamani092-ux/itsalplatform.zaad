# تقرير حالة المنصة — itsalplatform.zaad

**الفرع:** `cursor/uat-fix-package-f122`  
**الأساس:** `main` @ `2b22ca4` (PR #5)  
**بعد الإصلاحات:** `91875e1` (FIX-1…FIX-5)  
**تاريخ التقرير:** 2026-09-05  
**المنهج:** فحص كود فعلي + نتائج GATE FIX المحلية (ليست تقديرات)

---

## 0) نتيجة بوابة الإصلاح (GATE FIX)

| فحص | النتيجة |
|------|---------|
| `npx tsc --noEmit` (أخطاء حقيقية باستثناء generated/prisma) | **0** |
| `npm run build` | **نجاح** |
| `createdAt:` في `prisma/seed.ts` | **7** (≥ صفوف الطلبات الستة + حقل الإنشاء) |
| `Math.max(0` في `lib/sla.ts` + `lib/request-service.ts` | **موجود** (4 مواقع) |
| `isReceptionDesk` في schema + auth-service | **موجود** |
| `department?.receptionToken` في منطق deskAccess | **0** |
| مسار الإكمال يدعم `application/json` و `multipart/form-data` | **نعم** |

### commits

1. `a211315` — fix(sla): logical seed timestamps + non-negative duration guards + em-dash for null  
2. `5746332` — fix(auth): deskAccess from explicit isReceptionDesk flag, not department token  
3. `5779f81` — fix(types): resolve all 20 implicit-any errors (grants, hospitality, reception)  
4. `0b05854` — fix(requests): accept JSON on completion + friendly Arabic validation errors  
5. `91875e1` — chore(demo): login account hints + relaxed rate limit in non-production only  

> إنشاء Pull Request عبر الأداة فشل بصلاحية collaborator؛ الفرع مدفوع على الأصل وجاهز لفتح PR يدوياً:  
> `https://github.com/asamani092-ux/itsalplatform.zaad/compare/main...cursor/uat-fix-package-f122`

---

## 1) جرد الأدوات / الوحدات وحالتها بعد الإصلاح

المصدر الأساسي: [`lib/modules/registry.ts`](lib/modules/registry.ts) + مسارات `app/`.

| # | المفتاح | الاسم (واجهة) | المسار | الحالة بعد الإصلاح |
|---|---------|---------------|--------|---------------------|
| 1 | insights | لوحة المؤشرات | `/dashboard` | يعمل؛ SLA غير سالب بعد FIX-1؛ متوسطات ناقصة تُعرض «—» |
| 2 | workboard | لوحة العمل | `/dashboard/kanban` | يعمل (Kanban/إسناد) |
| 3 | team | الفريق | `/dashboard/team` | يعمل |
| 4 | request-forms | نماذج الطلبات | `/dashboard/forms` | يعمل + معاينة |
| 5 | hospitality | حجوزات الضيافة | `/dashboard/hospitality` | يعمل؛ APIs عامة للتوفر/التقويم |
| 6 | grants | إدارة المنح | `/dashboard/grants` | يعمل؛ مقيّد بمدير الإدارة |
| 7 | media | مركز الوثائق | `/dashboard/media` | يعمل |
| 8 | reception | الاستقبال والزيارات | `/dashboard/reception` | يعمل؛ الدخول عبر `isReceptionDesk` فقط للموظف العادي (FIX-2) |
| 9 | settings | الإعدادات | `/dashboard/settings` | يعمل (أقسام، أنواع، توجيه، وحدات، إدارات) |

### أسطح إضافية (خارج registry)

| # | الأداة/السطح | المسار | الحالة |
|---|--------------|--------|--------|
| 10 | تسجيل الدخول | `/` + `/login` | تلميحات حسابات + حد معدّل في غير الإنتاج فقط (FIX-5) |
| 11 | مساحة الموظف | `/employee` | سارة تصل هنا بعد FIX-2 |
| 12 | إكمال تذكرة | API + UI | JSON + multipart (FIX-4)؛ رسائل عربية للتحقق |
| 13 | نموذج طلب عام | `/request` | يعمل |
| 14 | نموذج ديناميكي | `/f/[slug]` | يعمل |
| 15 | موافقة المدير برابط | `/approve` | يعمل (رمز + صلاحية زمنية) |
| 16 | مكتب استقبال عام بالرمز | `/reception/[token]` | يعمل (رمز قسم) |
| 17 | نسيت/إعادة كلمة المرور | `/forgot-password` `/reset-password` | يعمل |
| 18 | صحة النظام | `/health` `/ping` | يعمل |
| 19 | صفحة UAT | `/uat` | سطح اختبار داخلي |
| 20 | إشعارات | `/api/notifications/*` | يعمل |
| 21 | رفع ملفات | `/api/uploads` | يعمل |
| 22 | توجيهات `/manager/*` | redirects | تُحوَّل إلى `/dashboard/*` عبر middleware |

**الخلاصة:** الوحدات الأساسية التسعة + الأسطح العامة تعمل بعد الحزمة. لا أداة مسجّلة في registry وُجدت «معطّلة بالكود» بعد الإصلاحات.

---

## 2) الهيكلة الإدارية والأدوار والصلاحيات

### الهيكل

- **Administration** (`INTERNAL` / `EXTERNAL`): إدارة اتصال مؤسسي داخلية + إدارات مقدّمي الطلب خارجياً.
- **Department (قسم)** يتبع إدارة داخلية؛ قد يحمل `receptionToken` للرابط العام فقط (لم يعد يمنح deskAccess).
- **CommEmployee**: موظف مربوط بقسم اختيارياً.

### الأدوار (`EmployeeRole`)

| الدور | المعنى | الوصول الأساسي |
|-------|--------|----------------|
| `DIRECTOR` | مدير الإدارة | `/dashboard` كامل + المنح + مؤشرات عامة |
| `SECTION_MANAGER` | مدير قسم | `/dashboard` بنطاق قسمه |
| `EMPLOYEE` | موظف | `/employee` ما لم يكن `isReceptionDesk` |

### قدرة مكتب الاستقبال (بعد FIX-2)

```
deskAccess =
  role ∈ {DIRECTOR, SECTION_MANAGER}
  OR isReceptionDesk === true
```

- سارة (`sara.comm@zaad.org`): `isReceptionDesk=false` → `/employee`
- الاستقبال (`reception@zaad.org`): `isReceptionDesk=true` → `/dashboard/reception`
- `receptionToken` على القسم يبقى لروابط `/reception/[token]` العامة فقط.

---

## 3) دورات الحياة

### أ) دورة حياة الطلب (`RequestStatus`)

```
Pending_Manager
  → Approved_Pending_Assignment
  → In_Progress
  → Completed
  → Archived
```

محطات رئيسية:
1. تقديم عام (`/request` أو نموذج) → بانتظار المدير.
2. موافقة برابط/لوحة → بانتظار الإسناد (مع قواعد توجيه اختيارية).
3. إسناد لموظف → قيد التنفيذ.
4. إكمال (JSON أو multipart + إثبات اختياري) → مكتمل + إشعار مقدّم الطلب.
5. أرشفة من الإدارة.

مؤشرات SLA: فروق زمنية محمية بـ `Math.max(0,…)`؛ غياب طرف = استبعاد من المتوسط / عرض «—».

### ب) دورة حياة المنحة المالية (من مانح للجمعية — ليست منحاً تعليمية)

- نماذج: `Grant` + `GrantStage`
- حالات المنحة: `Open` | `Closed`
- حالات المرحلة: `Pending` | `Done`
- التدفق: إنشاء (مراحل تلقائية) → تحديث مراحل → إغلاق/فتح → حذف
- الوصول: واجهة/API لـ **DIRECTOR** أساساً؛ مؤشر مراحل متأخرة في لوحة المنح

---

## 4) الحالة الأمنية (ملخص طبقات)

| الطبقة | التطبيق |
|--------|---------|
| جلسة | JWT في كوكي httpOnly؛ التحقق في middleware + حرّاس المسارات |
| أدوار | DIRECTOR / SECTION_MANAGER / EMPLOYEE + علم desk |
| حد معدّل | دخول: 5/دقيقة إنتاج، 20 غير إنتاج؛ حدود أخرى على الطلبات/الرفع |
| تحقق خادم | رسائل `VALIDATION:` عربية؛ لا أسرار مضمّنة في الكود |
| رفع إثبات | حجم/نوع ملف مقيّدان |
| رموز | موافقة + إعادة كلمة مرور بصلاحية زمنية |
| رؤوس HTTP | HSTS / X-Frame-Options / nosniff (via next.config) |
| CSRF مخصص | غير منفّذ؛ الاعتماد على SameSite + جلسة |

---

## 5) ملاحظات العميل غير المنفّذة (DEV-1…4)

| رمز | الموضوع | الوضع في الكود |
|-----|---------|----------------|
| DEV-1 | مطابقة المنح (مواءمة أعمق مع سياسات المانح/القسم) | وحدة المنح أساسية تعمل؛ لا منطق مطابقة متقدم إضافي |
| DEV-2 | تدقيق صلاحيات موسّع (مصفوفة صلاحيات دقيقة لكل API) | حرّاس أدوار موجودة؛ لا مصفوفة صلاحيات تفصيلية منفصلة |
| DEV-3 | دليل الإدارات | مسار إعدادات الإدارات موجود؛ تجربة «دليل» غنية للعميل قد تحتاج تعميقاً |
| DEV-4 | لوحة المتأخرات | لوحة المؤشرات تعرض متأخرات/قائمة؛ تحسينات UX/فلاتر إضافية خارج نطاق هذه الحزمة |

---

## 6) الجاهزية للإطلاق

### ما يعمل الآن
- مسار الطلب الكامل + SLA غير مضلّل بعد البذرة
- فصل موظف عادي عن مكتب الاستقبال
- إكمال تذكرة عبر JSON أو multipart
- منح مالية لمدير الإدارة
- ضيافة / استقبال / نماذج / وثائق / فريق / إعدادات
- بناء TypeScript وإنتاج Next ناجحان

### ما يحتاج عملاً قبل إنتاج صارم
- تنفيذ/مراجعة DEV-1…4 حسب أولوية العميل
- ضبط أسرار الجلسة و`DATABASE_URL` وSMTP في بيئة الإنتاج (بدون قيم تطوير)
- استبدال حد المعدّل في الذاكرة بـ Redis إن تعددت النسخ
- فتح PR ودمج الفرع يدوياً (صلاحية collaborator غير متاحة للوكيل)
- اختبار قبول يدوي بعد `migrate deploy` + `db seed` على قاعدة حقيقية

### مخاطر
- حد المعدّل في الذاكرة لا يتشارك بين instances
- إشعارات البريد تعتمد على تهيئة SMTP
- رفع الملفات محلياً على القرص يحتاج تخزيناً مشتركاً في نشر متعدد العقد
- عدم وجود CSRF صريح — مقبول نسبياً مع SameSite؛ يُراجع إن ظهرت عملاء غير متصفّح

---

## تقرير FIX السريع (لكل إصلاح)

| FIX | ملفات رئيسية | migration | tsc | build |
|-----|--------------|-----------|-----|-------|
| 1 SLA | `prisma/seed.ts`, `lib/sla.ts`, `lib/request-service.ts` | لا | 0 | ok |
| 2 desk | `schema`, migration `add_reception_desk_flag`, `auth-service`, seed | نعم — `npx prisma migrate deploy` ثم seed | 0 | ok |
| 3 types | grants/hospitality/attendance | لا | 0 | ok |
| 4 complete | `app/api/employee/tickets/[id]/complete/route.ts` | لا | 0 | ok |
| 5 demo | `LoginForm`, `app/page.tsx`, login route | لا | 0 | ok |

**أمر تطبيق migration:**

```bash
npx prisma migrate deploy
npx prisma db seed
```
