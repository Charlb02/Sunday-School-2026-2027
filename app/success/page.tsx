import Link from "next/link";

export default function SuccessPage() {
  return (
    <>
      <header className="masthead">
        <h1>
          الرسل الصغار
          <span className="year">٢٠٢٦</span>
        </h1>
      </header>
      <main className="shell">
        <div className="card" style={{ textAlign: "center", marginTop: "2rem" }}>
          <h2 className="display" style={{ fontSize: "1.9rem", margin: "0 0 0.5rem" }}>
            تمّ استلام التسجيل
          </h2>
          <p style={{ color: "var(--ink-soft)", maxWidth: "30rem", margin: "0 auto 1.5rem" }}>
            شكراً لكم. وصلتنا بياناتكم بنجاح، وسيتواصل معكم مسؤولو مدرسة الأحد قريباً
            بخصوص مواعيد بدء النشاط.
          </p>
          <Link href="/" className="btn btn-ghost" style={{ textDecoration: "none" }}>
            تسجيل عائلة أخرى
          </Link>
        </div>
      </main>
    </>
  );
}
