import Link from "next/link";
import BrandLogo from "@/components/shared/brand-logo";

export default function PublicSubmitShell({
  title,
  subtitle,
  introText,
  children,
}: {
  title: string;
  subtitle: string;
  introText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-3">
        <div className="rounded-lg border border-surface-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <BrandLogo size="lg" withWordmark={false} />
            <div>
              <h1 className="text-xl font-bold text-primary">{title}</h1>
              <p className="mt-1 text-sm text-brand-gray">{subtitle}</p>
            </div>
            {introText && (
              <p className="text-sm leading-relaxed text-brand-gray">{introText}</p>
            )}
          </div>
          {children}
        </div>
        <p className="text-center text-xs text-brand-gray">
          <Link href="/" className="underline">
            العودة لبوابة المنصة
          </Link>
        </p>
      </div>
    </div>
  );
}
