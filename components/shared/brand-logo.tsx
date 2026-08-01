/**
 * Association brand mark. Replace public/brand/logo.png with a new asset to
 * update it everywhere — no code change needed. The lockup already contains
 * the Arabic wordmark, so pages should not repeat it next to the image.
 */
const LOGO_ASPECT = 179 / 300;

const SIZES = {
  sm: 36,
  md: 52,
  lg: 84,
} as const;

export default function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const height = SIZES[size];
  const width = Math.round(height / LOGO_ASPECT);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.png"
      alt="شعار جمعية الزاد"
      width={width}
      height={height}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
