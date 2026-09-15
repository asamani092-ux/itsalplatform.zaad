# دليل النشر — منصة قسم الاتصال المؤسسي

## المتطلبات

- VPS مع Docker و Docker Compose
- نطاق فرعي موجّه إلى IP السيرفر (سجل A)
- ملف `.env` بقيم الإنتاج

## خطوات DNS

أنشئ سجل A للنطاق الفرعي، مثال:

```
comms.zaad.org.sa → 1.2.3.4
```

## المتغيرات البيئية المطلوبة

| المتغير | الوصف |
|---------|--------|
| `DATABASE_URL` | اتصال PostgreSQL الداخلي (مثال: `postgresql://USER:PASS@db:5432/DB?schema=public`) |
| `POSTGRES_USER` | مستخدم قاعدة البيانات |
| `POSTGRES_PASSWORD` | كلمة مرور قاعدة البيانات |
| `POSTGRES_DB` | اسم قاعدة البيانات |
| `SESSION_SECRET` | سر JWT — توليد: `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | URL العام (مثال: `https://comms.zaad.org.sa`) |
| `DOMAIN` | النطاق لـ Caddy (مثال: `comms.zaad.org.sa`) |
| `NODE_ENV` | `production` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | بريد الإشعارات |

## Coolify (Dockerfile)

1. Resource: **Application** + **PostgreSQL** منفصل.
2. Build Pack: **Dockerfile** — المنفذ **3001**.
3. المتغيرات: اجعل `NODE_ENV=production` **Runtime only** (ليس Build-time).
4. أضف على الأقل: `DATABASE_URL` · `SESSION_SECRET` · `NEXT_PUBLIC_APP_URL` · SMTP (Outlook: `smtp.office365.com:587`).
5. عند الإقلاع يُرحَّل المخطط تلقائياً عبر `scripts/migrate-deploy.mjs` (بـ `pg` فقط).
6. بعد دمج إصلاحات النشر: **Redeploy + Force Rebuild** (لا تعتمد على صورة SHA قديمة).
7. بعد إقلاع ناجح أنشئ المدير مرة واحدة:

```bash
ADMIN_PASSWORD='كلمة-قوية' node scripts/create-director.mjs
```

ترحيل يدوي عند الحاجة:

```bash
node scripts/migrate-deploy.mjs
```

الحساب الافتراضي: `td@alzaad.org.sa` بدور `DIRECTOR`.

## النشر الأول (Docker Compose على VPS)

```bash
git clone https://github.com/asamani092-ux/itsalplatform.zaad.git
cd itsalplatform.zaad
git checkout main
cp .env.example .env
# املأ القيم في .env
chmod +x scripts/deploy.sh scripts/backup-db.sh
./scripts/deploy.sh
```

## التحديث

```bash
./scripts/deploy.sh
```

## النسخ الاحتياطي

```bash
./scripts/backup-db.sh
```

Cron يومي (الساعة 3 صباحاً):

```
0 3 * * * /path/to/itsalplatform.zaad/scripts/backup-db.sh
```

## استكشاف الأخطاء

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml exec app sh
curl -s https://YOUR_DOMAIN/ping
curl -s https://YOUR_DOMAIN/api/health
```

## الأمان

- `SESSION_SECRET` قوي (48 بايت)
- HTTPS تلقائي عبر Caddy
- PostgreSQL على شبكة داخلية فقط (غير مكشوف خارجياً)
- ملفات الرفع محمية بـ `X-Content-Type-Options: nosniff`
