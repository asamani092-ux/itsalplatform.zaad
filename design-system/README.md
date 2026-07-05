# نظام تصميم الزاد

حزمة قابلة للنقل لاعتماد هوية **جمعية الزاد** في أي مشروع (Next.js، React، Vue، WordPress، HTML).

## محتويات الحزمة

| الملف | الاستخدام |
|-------|-----------|
| `tokens.json` | Figma Tokens / Style Dictionary / أدوات التصميم |
| `tokens.css` | متغيرات CSS — أي منصة |
| `components.css` | فئات جاهزة (أزرار، بطاقات، حقول، جداول) |
| `tailwind.preset.ts` | Preset لـ Tailwind CSS |
| `examples/html-rtl-demo.html` | معاينة بدون إطار عمل |

## الألوان

| Token | Hex | الاستخدام |
|-------|-----|-----------|
| `primary` | `#8B1538` | عناوين، أزرار أساسية، روابط |
| `primary-dark` | `#6E102C` | hover للأزرار |
| `secondary` | `#F2B824` | تمييز، CTA تسجيل، شريط تقدم |
| `brand-gray` | `#706F6F` | نصوص ثانوية |
| `surface` | `#FFFFFF` | خلفية البطاقات |
| `surface-muted` | `#F5F5F5` | خلفية الصفحات |
| `surface-border` | `#E8E8E8` | حدود |

### ألوان دلالية (Semantic)

| الحالة | لون النص | خلفية |
|--------|----------|-------|
| نجاح | `#15803D` | `#DCFCE7` |
| تحذير / طلب معلّق | `#854D0E` | `#FEF9C3` |
| خطأ / حذف | `#991B1B` | `#FEE2E2` |

## الخط

- **العائلة:** Tajawal (Google Fonts) → Tahoma → Arial
- **الأوزان:** 400، 500، 700، 800
- **الاتجاه:** RTL افتراضي، `text-align: start`
- **حقول LTR:** email، tel، url، datetime-local → `dir="ltr"`

```html
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
```

## المكوّنات (CSS Classes)

### أزرار

| Class | الوصف |
|-------|-------|
| `.btn-primary` | إجراء رئيسي — خلفية `#8B1538` |
| `.btn-secondary` | إجراء ثانوي — حدود رمادية |
| `.btn-recommend` | توصية مرحلة — أصفر + نص أحمر داكن |
| `.btn-register` | CTA التسجيل — أصفر فاتح |

### بطاقات

| Class | الوصف |
|-------|-------|
| `.card` | بطاقة عامة — `rounded-xl`, border-2, shadow-sm |
| `.card-section` | قسم داخل لوحة — border بلون primary/20 |

### نماذج

| Class | الوصف |
|-------|-------|
| `.input-field` | حقل إدخال |
| `.label-field` | تسمية الحقل |

### شارات

| Class | الوصف |
|-------|-------|
| `.badge-primary` | حالة نشطة / مرحلة |
| `.badge-warning` | طلب معلّق |
| `.badge-danger` | خطأ / غير مرفق |
| `.badge-success` | نجاح / مرفق |

### تخطيط

| Class | الوصف |
|-------|-------|
| `.zaad-root` | جذر RTL للصفحة |
| `.page-shell` | خلفية الصفحة الكاملة |
| `.page-container` | `max-width: 72rem` — لوحات التحكم |
| `.page-container-narrow` | `max-width: 28rem` — تسجيل/دخول |
| `.tab-bar` | شريط تبويبات segmented |
| `.zaad-table` | جدول بيانات موحّد |

## التبنّي حسب المنصة

### 1) Next.js / React + Tailwind (موصى به)

```ts
// tailwind.config.ts
import zaadPreset from "./design-system/tailwind.preset";

const config = {
  presets: [zaadPreset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
};
export default config;
```

```tsx
// app/layout.tsx
<html lang="ar" dir="rtl">
  <body className="zaad-root min-h-screen bg-surface-muted font-sans antialiased">
```

```css
/* app/globals.css */
@import "../design-system/tokens.css";
@import "../design-system/components.css";
```

### 2) HTML / WordPress / PHP

```html
<link rel="stylesheet" href="/design-system/tokens.css" />
<link rel="stylesheet" href="/design-system/components.css" />
<body class="zaad-root page-shell">
```

### 3) Figma

استورد `tokens.json` عبر plugin **Tokens Studio** أو أنشئ Variables يدوياً من جدول الألوان أعلاه.

### 4) React Native / Flutter

استخدم `tokens.json` كمصدر — حوّله عبر Style Dictionary إلى:
- `theme.ts` (RN)
- `app_theme.dart` (Flutter)

## أنماط التخطيط المتكررة

### لوحة تحكم

```
min-h-screen bg-surface-muted
  └─ Navbar (border-b, bg-surface, shadow-sm, max-w-page)
  └─ main.page-container.space-y-6
       └─ KPI grid: grid gap-4 sm:grid-cols-2 lg:grid-cols-4
       └─ .card
       └─ .tab-bar
```

### صفحة auth

```
min-h-screen bg-surface-muted
  └─ main.page-container-narrow
       └─ .card + form.space-y-4
```

## قواعد RTL

1. استخدم `text-start` / `text-end` — **لا** `text-right` / `text-left` للمحتوى العربي
2. استخدم `ms-*` / `me-*` / `ps-*` / `pe-*` — **لا** `ml-*` / `mr-*`
3. `dir="ltr"` للأرقام والبريد والجوال فقط

## Typography Scale (Tailwind)

| الاستخدام | Class |
|-----------|-------|
| عنوان صفحة | `text-2xl font-bold text-primary` |
| عنوان بطاقة | `text-xl font-bold text-primary` |
| عنوان قسم | `text-lg font-bold text-primary` |
| نص أساسي | `text-sm text-brand-gray` |
| تسمية حقل | `text-xs font-semibold text-brand-gray` |
| KPI رقم | `text-2xl font-bold text-primary` |

## التحقق

افتح `design-system/examples/html-rtl-demo.html` في المتصفح للمعاينة الفورية.

```bash
npm run build
```

## الترخيص

للاستخدام الداخلي لجمعية الزاد والمشاريع التابعة.
