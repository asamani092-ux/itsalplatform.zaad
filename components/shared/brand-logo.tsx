/**
 * Association brand mark. Replace public/brand/zaad-logo.svg with the official
 * asset to update it everywhere — no code change needed.
 */
export default function BrandLogo({
  size = "md",
  withWordmark = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
}) {
  const dimensions = {
    sm: { mark: 28, title: "text-sm", subtitle: "text-[10px]" },
    md: { mark: 44, title: "text-lg", subtitle: "text-xs" },
    lg: { mark: 72, title: "text-2xl", subtitle: "text-sm" },
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/zaad-logo.svg"
        alt="شعار جمعية الزاد"
        width={dimensions.mark}
        height={Math.round(dimensions.mark * 1.17)}
        className="shrink-0"
      />
      {withWordmark && (
        <div className="min-w-0">
          <p className={`font-extrabold leading-tight text-primary ${dimensions.title}`}>
            جمعية الزاد
          </p>
          <p className={`text-brand-gray ${dimensions.subtitle}`}>الاتصال المؤسسي</p>
        </div>
      )}
    </div>
  );
}
