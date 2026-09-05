# تقرير حالة المنصة — itsalplatform.zaad

**الفرع:** `cursor/uat-fix-package-f122`  
**الأساس:** `main` @ `2b22ca4` (PR #5)  
**رأس الفرع:** `ba9d533`  
**تاريخ التقرير:** 2026-09-05  
**المنهج:** فحص كود فعلي + نتائج GATE FIX المحلية

---

## 0) نتيجة بوابة الإصلاح (GATE FIX)

| فحص | النتيجة |
|------|---------|
| `npx tsc --noEmit` (أخطاء حقيقية عدا generated/prisma) | **0** |
| `npm run build` | **نجاح** |
| `createdAt:` في `prisma/seed.ts` | **7** |
| `Math.max(0` في `lib/sla.ts` + `lib/request-service.ts` | **4 مواقع** |
| `isReceptionDesk` في schema + `lib/auth-service.ts` | **موجود** |
| `department?.receptionToken` في منطق deskAccess | **0** |
| `app/api/employee/tickets/[id]/complete/route.ts` JSON + multipart | **نعم** |

### commits

| # | SHA | الرسالة |
|---|-----|---------|
| FIX-1 | `a211315` | fix(sla): logical seed timestamps + non-negative duration guards + em-dash for null |
| FIX-2 | `5746332` | fix(auth): deskAccess from explicit isReceptionDesk flag, not department token |
| FIX-3 | `5779f81` | fix(types): resolve all 20 implicit-any errors (grants, hospitality, reception) |
| FIX-4 | `0b05854` | fix(requests): accept JSON on completion + friendly Arabic validation errors |
| FIX-5 | `91875e1` | chore(demo): login account hints + relaxed rate limit in non-production only |
| تقرير | `ba9d533` | docs: platform status report after UAT fix package GATE |

> فتح PR عبر الأداة فشل (صلاحية collaborator). الفرع مدفوع — افتح PR يدوياً:  
> `main` ← `cursor/uat-fix-package-f122`

```bash
npx prisma migrate deploy
npx prisma db seed
```

Migration: `prisma/migrations/20260905120000_add_reception_desk_flag`

---

## 1) جرد الأدوات / الوحدات

المصدر: [`lib/modules/registry.ts`](../lib/modules/registry.ts) + `app/`.

| # | المفتاح | الاسم | المسار | الحالة بعد الإصلاح |
|---|---------|-------|--------|---------------------|
| 1 | insights | لوحة المؤشرات | `/dashboard` | يعمل؛ SLA ≥ 0 أو «—» |
| 2 | workboard | لوحة العمل | `/dashboard/kanban` | يعمل |
| 3 | team | الفريق | `/dashboard/team` | يعمل |
| 4 | request-forms | نماذج الطلبات | `/dashboard/forms` | يعمل + معاينة |
| 5 | hospitality | حجوزات الضيافة | `/dashboard/hospitality` | يعمل |
| 6 | grants | إدارة المنح | `/dashboard/grants` | يعمل (DIRECTOR) |
| 7 | media | مركز الوثائق | `/dashboard/media` | يعمل |
| 8 | reception | الاستقبال والزيارات | `/dashboard/reception` | يعمل؛ desk عبر العلم |
| 9 | settings | الإعدادات | `/dashboard/settings` | يعمل |

### أسطح إضافية

| # | السطح | المسار | الحالة |
|---|--------|--------|--------|
| 10 | دخول | `/` `/login` | تلميحات + حد 20/د غير إنتاج |
| 11 | موظف | `/employee` | سارة هنا بعد FIX-2 |
| 12 | إكمال تذكرة | complete API | JSON + multipart + عربي |
| 13 | طلب عام | `/request` | يعمل |
| 14 | نموذج ديناميكي | `/f/[slug]` | يعمل |
| 15 | موافقة برابط | `/approve` | يعمل |
| 16 | استقبال بالرمز | `/reception/[token]` | يعمل |
| 17 | كلمة المرور | forgot/reset | يعمل |
| 18 | صحة | `/health` `/ping` | يعمل |
| 19 | UAT | `/uat` | اختبار |
| 20 | إشعارات | `/api/notifications/*` | يعمل |
| 21 | رفع | `/api/uploads` | يعمل |
| 22 | `/manager/*` | middleware | → `/dashboard/*` |

---

## 2) الهيكلة والأدوار

- **Administration** (`INTERNAL` / `EXTERNAL`)
- **Department**؛ `receptionToken` للرابط العام فقط
- **CommEmployee.isReceptionDesk**

| الدور (`EmployeeRole`) | الوصول |
|------------------------|--------|
| `DIRECTOR` | لوحة كاملة + المنح |
| `SECTION_MANAGER` | لوحة بنطاق القسم |
| `EMPLOYEE` | `/employee` إلا مع `isReceptionDesk` |

```
deskAccess = DIRECTOR | SECTION_MANAGER | isReceptionDesk === true
```

- سارة: `isReceptionDesk=false` → `/employee`
- الاستقبال: `isReceptionDesk=true` → مكتب الاستقبال

---

## 3) دورات الحياة

### الطلب (`RequestStatus`)

`Pending_Manager` → `Approved_Pending_Assignment` → `In_Progress` → `Completed` → `Archived`

### المنحة المالية (مانح → جمعية)

- `Grant` / مراحل؛ `GrantStatus`: `Open` | `Closed`
- وصول DIRECTOR أساساً

---

## 4) الأمن (ملخص)

| طبقة | الواقع |
|------|--------|
| جلسة | JWT + كوكي httpOnly؛ middleware + حرّاس |
| أدوار + desk | علم صريح |
| حد معدّل | دخول 5/د إنتاج، 20 غير إنتاج |
| تحقق | عربي؛ قيود الملفات |
| رموز | موافقة / إعادة كلمة مرور بزمن |
| رؤوس | HSTS / frame deny / nosniff |
| CSRF مخصص | غير منفّذ؛ SameSite |

---

## 5) DEV-1…4 (خارج هذه الحزمة)

| رمز | الموضوع | الوضع |
|-----|---------|--------|
| DEV-1 | مطابقة منح أعمق | وحدة أساسية فقط |
| DEV-2 | مصفوفة صلاحيات تفصيلية | حرّاس أدوار فقط |
| DEV-3 | دليل إدارات أغنى | إعدادات موجودة |
| DEV-4 | لوحة متأخرات أغنى | مؤشرات موجودة؛ UX معلّق |

---

## 6) الجاهزية

**يعمل الآن:** مسار الطلب + SLA سليم بعد البذرة، فصل الاستقبال، إكمال JSON، المنح، الضيافة، النماذج، البناء النظيف.

**قبل إنتاج صارم:** DEV-1…4، أسرار إنتاج، Redis لحد المعدّل عند تعدد النسخ، تخزين ملفات مشترك، دمج PR يدوياً، UAT بعد migrate+seed.

**مخاطر:** rate-limit ذاكري؛ SMTP؛ ملفات محلية؛ غياب CSRF صريح.
