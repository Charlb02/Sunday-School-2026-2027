"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { ChildRow, Registration } from "@/lib/types";
import Dashboard from "./Dashboard";

type State = "loading" | "signed-out" | "denied" | "ready";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<State>("loading");
  const [rows, setRows] = useState<ChildRow[]>([]);

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "registrations"), orderBy("created_at", "desc"))
      );
      const flat: ChildRow[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const reg: Registration = {
          id: doc.id,
          created_at: d.created_at?.toDate?.().toISOString() ?? new Date().toISOString(),
          parent1_name: d.parent1_name,
          parent2_name: d.parent2_name ?? null,
          address: d.address,
          phone1: d.phone1,
          phone2: d.phone2 ?? null,
          email: d.email,
          photo_consent: !!d.photo_consent,
          mass_consent: !!d.mass_consent,
          children: d.children ?? [],
        };
        reg.children.forEach((child) => flat.push({ child, reg }));
      });
      setRows(flat);
      setState("ready");
    } catch (e: any) {
      // Signed in, but not on the admin allowlist.
      if (e?.code === "permission-denied") setState("denied");
      else {
        console.error(e);
        setState("denied");
      }
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setState("signed-out");
        setRows([]);
      } else {
        setState("loading");
        load();
      }
    });
  }, [load]);

  if (state === "loading") {
    return (
      <div className="login-wrap">
        <p style={{ color: "var(--ink-soft)" }}>جارٍ التحميل…</p>
      </div>
    );
  }

  if (state === "signed-out") return <LoginCard />;

  return (
    <>
      <div className="admin-bar">
        <h1>الرسل الصغار ٢٠٢٦ — لوحة الإدارة</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#cfdaee" }} dir="ltr">
            {user?.email}
          </span>
          <button className="btn btn-ghost" onClick={() => signOut(auth)}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="admin-wrap">
        {state === "denied" ? (
          <div className="card">
            <h2 className="display" style={{ marginTop: 0 }}>
              لا تملكون صلاحية الوصول
            </h2>
            <p style={{ color: "var(--ink-soft)", margin: 0 }}>
              هذا الحساب ليس ضمن قائمة المسؤولين. تواصلوا مع مسؤول النظام لإضافة
              حسابكم، أو سجّلوا الدخول بحساب آخر.
            </p>
          </div>
        ) : (
          <Dashboard rows={rows} reload={load} />
        )}
      </div>
    </>
  );
}

function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1 className="display" style={{ fontSize: "1.6rem", margin: "0 0 0.25rem" }}>
          لوحة إدارة التسجيل
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginTop: 0 }}>
          الرسل الصغار ٢٠٢٦
        </p>

        <div className="field">
          <label>البريد الإلكتروني</label>
          <input
            type="email"
            dir="ltr"
            style={{ textAlign: "right" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>كلمة المرور</label>
          <input
            type="password"
            dir="ltr"
            style={{ textAlign: "right" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="err">{error}</p>}

        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "جارٍ الدخول…" : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
