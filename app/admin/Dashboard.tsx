"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase/client";
import type { ChildDoc, ChildRow, Registration } from "@/lib/types";

function ageOn(dob: string): number | "" {
  if (!dob) return "";
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return "";
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const YesNo = ({ v }: { v: boolean }) => (
  <span className={`pill ${v ? "pill-yes" : "pill-no"}`}>{v ? "نعم" : "لا"}</span>
);

export default function Dashboard({
  rows,
  reload,
}: {
  rows: ChildRow[];
  reload: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ChildRow | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(({ child, reg }) =>
      [
        child.full_name, child.school_name, child.allergy_details ?? "", child.notes ?? "",
        reg.parent1_name, reg.parent2_name ?? "", reg.phone1, reg.email, reg.address,
      ].join(" ").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const familyCount = new Set(filtered.map((r) => r.reg.id)).size;
  const allergyCount = filtered.filter((r) => r.child.has_allergy).length;
  const noPhotoCount = filtered.filter((r) => !r.reg.photo_consent).length;

  function exportExcel() {
    const data = filtered.map(({ child, reg }) => ({
      "تاريخ التسجيل": fmtDateTime(reg.created_at),
      "اسم الطفل": child.full_name,
      "تاريخ الميلاد": fmtDate(child.dob),
      العمر: ageOn(child.dob),
      المدرسة: child.school_name,
      حساسية: child.has_allergy ? "نعم" : "لا",
      "نوع الحساسية": child.allergy_details ?? "",
      "ملاحظات واحتياجات خاصة": child.notes ?? "",
      "وليّ الأمر الأول": reg.parent1_name,
      "وليّ الأمر الثاني": reg.parent2_name ?? "",
      العنوان: reg.address,
      "رقم الهاتف": reg.phone1,
      "رقم هاتف إضافي": reg.phone2 ?? "",
      "البريد الإلكتروني": reg.email,
      "موافقة التصوير": reg.photo_consent ? "نعم" : "لا",
      "التعهّد بالبقاء في القداس": reg.mass_consent ? "نعم" : "لا",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    // Arabic text and headers export correctly. The sheet itself opens
    // left-to-right: Excel in an Arabic UI flips it automatically, otherwise
    // use Page Layout -> Sheet Right-to-Left. (The npm build of SheetJS
    // ignores the RTL sheet-view flag, so there is nothing to set here.)
    ws["!cols"] = [
      { wch: 18 }, { wch: 24 }, { wch: 13 }, { wch: 7 }, { wch: 22 },
      { wch: 9 }, { wch: 22 }, { wch: 40 }, { wch: 22 }, { wch: 22 },
      { wch: 34 }, { wch: 16 }, { wch: 16 }, { wch: 26 }, { wch: 14 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التسجيلات");
    XLSX.writeFile(wb, `الرسل-الصغار-2026-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function onDelete({ child, reg }: ChildRow) {
    const last = reg.children.length === 1;
    const msg = last
      ? `«${child.full_name}» هو الطفل الوحيد في هذا التسجيل. سيُحذف التسجيل بالكامل مع بيانات الوالدين. هل تريدون المتابعة؟`
      : `حذف سجلّ «${child.full_name}» نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`;
    if (!confirm(msg)) return;
    try {
      if (last) await deleteDoc(doc(db, "registrations", reg.id));
      else
        await updateDoc(doc(db, "registrations", reg.id), {
          children: reg.children.filter((c) => c.id !== child.id),
        });
      await reload();
    } catch {
      alert("تعذّر حذف السجلّ.");
    }
  }

  return (
    <>
      <div className="toolbar">
        <input
          type="text"
          placeholder="بحث بالاسم، المدرسة، اسم وليّ الأمر، الهاتف…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="stat">الأطفال <b>{filtered.length}</b></span>
        <span className="stat">العائلات <b>{familyCount}</b></span>
        <span className="stat">حالات حساسية <b>{allergyCount}</b></span>
        <span className="stat">رفض التصوير <b>{noPhotoCount}</b></span>
        <button className="btn btn-gold" onClick={exportExcel} style={{ marginRight: "auto" }}>
          تصدير إلى Excel
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            {rows.length === 0
              ? "لم يصل أي تسجيل بعد. شاركوا رابط الاستمارة مع الأهالي لبدء استقبال التسجيلات."
              : "لا توجد نتائج مطابقة لبحثكم."}
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>تاريخ التسجيل</th><th>اسم الطفل</th><th>تاريخ الميلاد</th><th>العمر</th>
                <th>المدرسة</th><th>حساسية</th><th>نوع الحساسية</th><th>ملاحظات</th>
                <th>وليّ الأمر الأول</th><th>وليّ الأمر الثاني</th><th>العنوان</th>
                <th>الهاتف</th><th>البريد الإلكتروني</th><th>التصوير</th><th>القداس</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ child, reg }) => (
                <tr key={child.id}>
                  <td>{fmtDateTime(reg.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{child.full_name}</td>
                  <td>{fmtDate(child.dob)}</td>
                  <td>{ageOn(child.dob)}</td>
                  <td>{child.school_name}</td>
                  <td><YesNo v={child.has_allergy} /></td>
                  <td className="wrapcell">{child.allergy_details ?? "—"}</td>
                  <td className="wrapcell">{child.notes ?? "—"}</td>
                  <td>{reg.parent1_name}</td>
                  <td>{reg.parent2_name ?? "—"}</td>
                  <td className="wrapcell">{reg.address}</td>
                  <td dir="ltr" style={{ textAlign: "right" }}>
                    {reg.phone1}{reg.phone2 ? ` / ${reg.phone2}` : ""}
                  </td>
                  <td dir="ltr" style={{ textAlign: "right" }}>{reg.email}</td>
                  <td><YesNo v={reg.photo_consent} /></td>
                  <td><YesNo v={reg.mass_consent} /></td>
                  <td>
                    <button
                      className="btn-link"
                      style={{ color: "var(--azure)" }}
                      onClick={() => setEditing({ child, reg })}
                    >
                      تعديل
                    </button>
                    <button
                      className="btn-link"
                      onClick={() => onDelete({ child, reg })}
                      style={{ marginRight: "0.75rem" }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditModal row={editing} onClose={() => setEditing(null)} reload={reload} />
      )}
    </>
  );
}

function EditModal({
  row,
  onClose,
  reload,
}: {
  row: ChildRow;
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  const { child, reg } = row;
  const [c, setC] = useState<ChildDoc>({ ...child });
  const [f, setF] = useState({
    parent1_name: reg.parent1_name,
    parent2_name: reg.parent2_name ?? "",
    address: reg.address,
    phone1: reg.phone1,
    phone2: reg.phone2 ?? "",
    email: reg.email,
    photo_consent: reg.photo_consent,
    mass_consent: reg.mass_consent,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await updateDoc(doc(db, "registrations", reg.id), {
        ...f,
        parent2_name: f.parent2_name || null,
        phone2: f.phone2 || null,
        children: reg.children.map((x) =>
          x.id === child.id
            ? {
                ...c,
                allergy_details: c.has_allergy ? c.allergy_details || null : null,
                notes: c.notes || null,
              }
            : x
        ),
      });
      onClose();
      await reload();
    } catch {
      setErr("تعذّر حفظ التعديلات. تحقّقوا من الاتصال وحاولوا مرة أخرى.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>تعديل بيانات {child.full_name}</h2>
        <p className="hint" style={{ marginTop: "-0.6rem" }}>
          تعديل بيانات وليّ الأمر ينطبق على جميع أطفال العائلة نفسها.
        </p>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="field">
            <label>اسم الطفل</label>
            <input type="text" value={c.full_name} onChange={(e) => setC({ ...c, full_name: e.target.value })} />
          </div>
          <div className="two-up">
            <div className="field">
              <label>تاريخ الميلاد</label>
              <input type="date" value={c.dob} onChange={(e) => setC({ ...c, dob: e.target.value })} />
            </div>
            <div className="field">
              <label>المدرسة</label>
              <input type="text" value={c.school_name} onChange={(e) => setC({ ...c, school_name: e.target.value })} />
            </div>
          </div>
          <label className="consent" style={{ marginBottom: "1rem" }}>
            <input type="checkbox" checked={c.has_allergy} onChange={(e) => setC({ ...c, has_allergy: e.target.checked })} />
            <p>يعاني من حساسية</p>
          </label>
          {c.has_allergy && (
            <div className="field">
              <label>نوع الحساسية</label>
              <input type="text" value={c.allergy_details ?? ""} onChange={(e) => setC({ ...c, allergy_details: e.target.value })} />
            </div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>ملاحظات واحتياجات خاصة</label>
            <textarea value={c.notes ?? ""} onChange={(e) => setC({ ...c, notes: e.target.value })} />
          </div>
        </div>

        <div className="card">
          <div className="two-up">
            <div className="field">
              <label>وليّ الأمر الأول</label>
              <input type="text" value={f.parent1_name} onChange={(e) => setF({ ...f, parent1_name: e.target.value })} />
            </div>
            <div className="field">
              <label>وليّ الأمر الثاني</label>
              <input type="text" value={f.parent2_name} onChange={(e) => setF({ ...f, parent2_name: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>العنوان</label>
            <input type="text" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </div>
          <div className="two-up">
            <div className="field">
              <label>رقم الهاتف</label>
              <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={f.phone1} onChange={(e) => setF({ ...f, phone1: e.target.value })} />
            </div>
            <div className="field">
              <label>رقم هاتف إضافي</label>
              <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={f.phone2} onChange={(e) => setF({ ...f, phone2: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>البريد الإلكتروني</label>
            <input type="email" dir="ltr" style={{ textAlign: "right" }} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <label className="consent" style={{ marginBottom: "0.75rem" }}>
            <input type="checkbox" checked={f.photo_consent} onChange={(e) => setF({ ...f, photo_consent: e.target.checked })} />
            <p>موافقة على التصوير</p>
          </label>
          <label className="consent">
            <input type="checkbox" checked={f.mass_consent} onChange={(e) => setF({ ...f, mass_consent: e.target.checked })} />
            <p>التعهّد بالبقاء في القداس</p>
          </label>
        </div>

        {err && <p className="err">{err}</p>}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
