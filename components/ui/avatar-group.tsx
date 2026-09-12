export default function AvatarGroup({
  names,
  max = 3,
}: {
  names: string[];
  max?: number;
}) {
  const visible = names.slice(0, max);
  const rest = Math.max(0, names.length - max);

  return (
    <div className="zad-avatar-group" aria-label={`المسند إليهم: ${names.join("، ")}`}>
      {rest > 0 && <span className="zad-avatar zad-avatar--more">+{rest}</span>}
      {visible.map((name) => (
        <span key={name} className="zad-avatar" title={name}>
          {name.trim().charAt(0) || "؟"}
        </span>
      ))}
    </div>
  );
}
