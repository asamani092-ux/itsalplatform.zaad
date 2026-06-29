import Link from "next/link";

export default function HealthPage() {
  return (
    <main style={{ padding: 24, fontFamily: "Tahoma, Arial, sans-serif" }}>
      <h1>السيرفر يعمل ✓</h1>
      <p>إذا ظهرت هذه الصفحة، نفق Cursor يعمل بشكل صحيح.</p>
      <p>
        <Link href="/">الانتقال للرئيسية</Link>
      </p>
    </main>
  );
}
