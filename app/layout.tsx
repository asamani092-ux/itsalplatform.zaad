import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة قسم الاتصال المؤسسي — جمعية الزاد",
  description: "بوابة قسم الاتصال المؤسسي — Backend API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="zaad-root min-h-screen bg-surface-muted font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
