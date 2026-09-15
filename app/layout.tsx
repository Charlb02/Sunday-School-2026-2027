import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الرسل الصغار 2026 — استمارة التسجيل",
  description: "تسجيل الأطفال في نشاطات مدرسة الأحد — الرسل الصغار 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
