"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

interface MediaDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  sortOrder: number;
  createdAt: string;
}

const CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "brand", label: "هوية" },
  { id: "logos", label: "شعارات" },
  { id: "templates", label: "قوالب" },
  { id: "policies", label: "سياسات" },
  { id: "pdf", label: "PDF" },
  { id: "image", label: "صور" },
  { id: "document", label: "مستندات" },
] as const;

function badgeClass(category: string): string {
  switch (category) {
    case "brand":
    case "logos":
      return "badge-primary";
    case "templates":
      return "badge-warning";
    case "policies":
      return "badge-danger";
    case "pdf":
      return "badge-warning";
    case "image":
      return "badge-success";
    default:
      return "badge-primary";
  }
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(iso));
}

function inferCategoryFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image";
  }
  return "document";
}

export default function MediaDocumentsPage() {
  const [documents, setDocuments] = useState<MediaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaDocument | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "document",
    file: null as File | null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/media/documents");
      const payload = await parseApiResponse<{ documents: MediaDocument[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل الوثائق"));
      }
      setDocuments(payload.data.documents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesQuery = doc.title.toLowerCase().includes(query.trim().toLowerCase());
      const matchesCategory = category === "all" || doc.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [documents, query, category]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file) {
      setFormError("الملف مطلوب");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const uploadData = new FormData();
      uploadData.append("file", form.file);
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: uploadData,
      });
      const uploadPayload = await parseApiResponse<{ url: string }>(uploadRes);
      if (!uploadRes.ok || !uploadPayload.success) {
        throw new Error(getApiErrorMessage(uploadPayload, "فشل رفع الملف"));
      }

      const metaRes = await fetch("/api/media/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category || inferCategoryFromUrl(uploadPayload.data.url),
          fileUrl: uploadPayload.data.url,
        }),
      });
      const metaPayload = await parseApiResponse<MediaDocument>(metaRes);
      if (!metaRes.ok || !metaPayload.success) {
        throw new Error(getApiErrorMessage(metaPayload, "فشل حفظ الوثيقة"));
      }

      setModalOpen(false);
      setForm({ title: "", description: "", category: "document", file: null });
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/media/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const payload = await parseApiResponse<{ deleted: boolean }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الحذف"));
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-gray">مكتبة وثائق قسم الاتصال المؤسسي</p>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => {
            setFormError("");
            setModalOpen(true);
          }}
        >
          رفع وثيقة
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input-field w-full sm:max-w-sm"
          placeholder="بحث بالعنوان..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث بالعنوان"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                category === item.id
                  ? "bg-primary text-white"
                  : "border border-surface-border bg-surface text-brand-gray"
              }`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="card py-12 text-center text-sm text-brand-gray">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center text-sm text-brand-gray">لا توجد وثائق مطابقة</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => (
            <article key={doc.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-primary">{doc.title}</h3>
                <span className={badgeClass(doc.category)}>{doc.category}</span>
              </div>
              <p className="line-clamp-3 flex-1 text-sm text-brand-gray">
                {doc.description || "بدون وصف"}
              </p>
              <p className="text-xs text-brand-gray">{formatDate(doc.createdAt)}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs"
                >
                  معاينة
                </a>
                <a href={doc.fileUrl} download className="btn-secondary text-xs">
                  تنزيل
                </a>
                <button
                  type="button"
                  className="btn-secondary border-[var(--tmkeen-danger)] text-xs text-[var(--tmkeen-danger)]"
                  onClick={() => setDeleteTarget(doc)}
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-doc-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal-panel card space-y-4">
            <h2 id="upload-doc-title" className="text-lg font-bold text-primary">
              رفع وثيقة
            </h2>
            <form className="space-y-3" onSubmit={(e) => void handleUpload(e)}>
              <div className="space-y-1">
                <label className="label-field" htmlFor="doc-title">
                  العنوان
                </label>
                <input
                  id="doc-title"
                  className="input-field w-full"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="doc-description">
                  الوصف
                </label>
                <textarea
                  id="doc-description"
                  className="input-field min-h-20 w-full"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="doc-category">
                  النوع
                </label>
                <select
                  id="doc-category"
                  className="input-field w-full"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="doc-file">
                  الملف (PDF / PNG / JPG)
                </label>
                <input
                  id="doc-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  className="input-field w-full"
                  onChange={(e) =>
                    setForm({ ...form, file: e.target.files?.[0] ?? null })
                  }
                  required
                />
              </div>
              {formError && (
                <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
                  {formError}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setModalOpen(false)}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? "جاري الرفع..." : "رفع"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-panel card space-y-4">
            <h2 className="text-lg font-bold text-primary">تأكيد الحذف</h2>
            <p className="text-sm text-brand-gray">هل أنت متأكد من حذف هذه الوثيقة؟</p>
            <p className="font-semibold text-primary">{deleteTarget.title}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn-primary flex-1 border-[var(--tmkeen-danger)] bg-[var(--tmkeen-danger)]"
                disabled={submitting}
                onClick={() => void handleDelete()}
              >
                {submitting ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
