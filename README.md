# منصة قسم الاتصال المؤسسي — نموذج أولي

نموذج أولي بصري لفكرة بوابة قسم الاتصال المؤسسي في **جمعية الزاد**، مبني على **نظام تصميم الزاد** فقط.

> لا يوجد backend أو قاعدة بيانات — المشروع للمعاينة والتصميم.

## المتطلبات

- Node.js 20+

## التشغيل

```bash
npm install
npm run dev
```

المنفذ: `http://localhost:3001`

## هيكل المشروع

```
design-system/     نظام التصميم الكامل (tokens, components, preset)
app/               نموذج أولي Next.js للمعاينة
```

## نظام التصميم

راجع `design-system/README.md` للتفاصيل الكاملة.

```ts
// tailwind.config.ts
import zaadPreset from "./design-system/tailwind.preset";
```

معاينة HTML بدون إطار عمل: `design-system/examples/html-rtl-demo.html`

## الترخيص

للاستخدام الداخلي لجمعية الزاد والمشاريع التابعة.
