"use client";

import { useMemo, useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase/client";
import {
  GRADES, gradeLabel, sacramentFor, SACRAMENT_LABEL,
  LESSONS_LABEL, CELEBRATION_LABEL, GENDER_LABEL,
  type ChildDoc, type ChildRow,
} from "@/lib/types";

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
        child.full_name, child.school_name, gradeLabel(child.grade),
        child.allergy_details ?? "", child.other_condition ?? "", child.notes ?? "",
        child.sacrament?.sponsor_name ?? "",
        reg.father_name ?? "", reg.mother_name ?? "", reg.parish,
        reg.father_phone ?? "", reg.mother_phone ?? "", reg.emergency_phone,
        reg.email, reg.city, reg.street, reg.signer_name,
      ].join(" ").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const familyCount = new Set(filtered.map((r) => r.reg.id)).size;
  const allergyCount = filtered.filter((r) => r.child.has_allergy).length;
  const noPhotoCount = filtered.filter((r) => !r.reg.photo_consent).length;
  const communionCount = filtered.filter((r) => r.child.sacrament?.type === "communion").length;
  const confirmationCount = filtered.filter((r) => r.child.sacrament?.type === "confirmation").length;

  function exportExcel() {
    const data = filtered.map(({ child, reg }) => ({
      "تاريخ التسجيل": fmtDateTime(reg.created_at),
      "الاسم الثلاثي": child.full_name,
      "تاريخ الميلاد": fmtDate(child.dob),
      العمر: ageOn(child.dob),
      الجنس: GENDER_LABEL[child.gender],
      "الصف / المرحلة": gradeLabel(child.grade),
      المدرسة: child.school_name,
      حساسية: child.has_allergy ? "نعم" : "لا",
      "نوع الحساسية": child.allergy_details ?? "",
      "حالة صحية أخرى": child.other_condition ?? "",
      "ملاحظات إضافية": child.notes ?? "",
      السرّ: child.sacrament ? SACRAMENT_LABEL[child.sacrament.type] : "",
      "اسم الإشبين/الإشبينة": child.sacrament?.sponsor_name ?? "",
      "مكان الدروس التحضيرية": child.sacrament?.lessons_place
        ? LESSONS_LABEL[child.sacrament.lessons_place] : "",
      "مكان الاحتفال بالسرّ": child.sacrament?.celebration_place
        ? CELEBRATION_LABEL[child.sacrament.celebration_place] : "",
      "اسم الأب / وليّ الأمر": reg.father_name ?? "",
      "هاتف الأب": reg.father_phone ?? "",
      "اسم الأم / وليّة الأمر": reg.mother_name ?? "",
      "هاتف الأم": reg.mother_phone ?? "",
      "هاتف الطوارئ": reg.emergency_phone,
      الرعية: reg.parish,
      "البريد الإلكتروني": reg.email,
      المدينة: reg.city,
      الشارع: reg.street,
      البيت: reg.house,
      "الرمز البريدي": reg.postal_code ?? "",
      "موافقة استخدام الصور": reg.photo_consent ? "نعم" : "لا",
      "الإقرار بصحة المعلومات": reg.declaration ? "نعم" : "لا",
      "اسم الموقّع": reg.signer_name,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    // Arabic text and headers export correctly. The sheet itself opens
    // left-to-right: Excel in an Arabic UI flips it automatically, otherwise
    // use Page Layout -> Sheet Right-to-Left. (The npm build of SheetJS
    // ignores the RTL sheet-view flag, so there is nothing to set here.)
    ws["!cols"] = Object.keys(data[0] ?? {}).map((k) => ({
      wch: ["ملاحظات إضافية", "مكان الدروس التحضيرية"].includes(k) ? 42
        : ["الشارع", "البريد الإلكتروني", "مكان الاحتفال بالسرّ"].includes(k) ? 28
        : Math.max(12, k.length + 6),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التسجيلات");
    XLSX.writeFile(wb, `مدرسة-الأحد-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        <span className="stat">المناولة <b>{communionCount}</b></span>
        <span className="stat">التثبيت <b>{confirmationCount}</b></span>
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
                <th>تاريخ التسجيل</th><th>الاسم الثلاثي</th><th>تاريخ الميلاد</th><th>العمر</th>
                <th>الجنس</th><th>الصف</th><th>المدرسة</th>
                <th>السرّ</th><th>الإشبين/الإشبينة</th><th>مكان الدروس</th><th>مكان الاحتفال</th>
                <th>حساسية</th><th>نوع الحساسية</th><th>حالة صحية أخرى</th><th>ملاحظات</th>
                <th>الأب</th><th>هاتف الأب</th><th>الأم</th><th>هاتف الأم</th><th>الطوارئ</th>
                <th>الرعية</th><th>البريد الإلكتروني</th><th>العنوان</th>
                <th>الصور</th><th>الموقّع</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ child, reg }) => (
                <tr key={child.id}>
                  <td>{fmtDateTime(reg.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{child.full_name}</td>
                  <td>{fmtDate(child.dob)}</td>
                  <td>{ageOn(child.dob)}</td>
                  <td>{GENDER_LABEL[child.gender]}</td>
                  <td>{gradeLabel(child.grade)}</td>
                  <td>{child.school_name}</td>
                  <td>
                    {child.sacrament ? (
                      <span className="pill" style={{ background: "#f3e8d0", color: "#8a6420" }}>
                        {SACRAMENT_LABEL[child.sacrament.type]}
                      </span>
                    ) : "—"}
                  </td>
                  <td>{child.sacrament?.sponsor_name || "—"}</td>
                  <td className="wrapcell">
                    {child.sacrament?.lessons_place
                      ? LESSONS_LABEL[child.sacrament.lessons_place] : "—"}
                  </td>
                  <td className="wrapcell">
                    {child.sacrament?.celebration_place
                      ? CELEBRATION_LABEL[child.sacrament.celebration_place] : "—"}
                  </td>
                  <td><YesNo v={child.has_allergy} /></td>
                  <td className="wrapcell">{child.allergy_details ?? "—"}</td>
                  <td className="wrapcell">{child.other_condition ?? "—"}</td>
                  <td className="wrapcell">{child.notes ?? "—"}</td>
                  <td>{reg.father_name ?? "—"}</td>
                  <td dir="ltr" style={{ textAlign: "right" }}>{reg.father_phone ?? "—"}</td>
                  <td>{reg.mother_name ?? "—"}</td>
                  <td dir="ltr" style={{ textAlign: "right" }}>{reg.mother_phone ?? "—"}</td>
                  <td dir="ltr" style={{ textAlign: "right" }}>{reg.emergency_phone}</td>
                  <td>{reg.parish}</td>
                  <td dir="ltr" style={{ textAlign: "right" }}>{reg.email}</td>
                  <td className="wrapcell">
                    {reg.city}، {reg.street}، {reg.house}
                    {reg.postal_code ? `، ${reg.postal_code}` : ""}
                  </td>
                  <td><YesNo v={reg.photo_consent} /></td>
                  <td>{reg.signer_name}</td>
                  <td>
                    <button className="btn-link" style={{ color: "var(--azure)" }}
                      onClick={() => setEditing({ child, reg })}>تعديل</button>
                    <button className="btn-link" onClick={() => onDelete({ child, reg })}
                      style={{ marginRight: "0.75rem" }}>حذف</button>
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
  row, onClose, reload,
}: {
  row: ChildRow; onClose: () => void; reload: () => Promise<void>;
}) {
  const { child, reg } = row;
  const [c, setC] = useState<ChildDoc>({ ...child });
  const [f, setF] = useState({
    father_name: reg.father_name ?? "",
    father_phone: reg.father_phone ?? "",
    mother_name: reg.mother_name ?? "",
    mother_phone: reg.mother_phone ?? "",
    parish: reg.parish,
    email: reg.email,
    city: reg.city,
    street: reg.street,
    house: reg.house,
    postal_code: reg.postal_code ?? "",
    emergency_phone: reg.emergency_phone,
    photo_consent: reg.photo_consent,
    signer_name: reg.signer_name,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Changing grade into or out of 4/6 adds or removes the sacrament block.
  function setGrade(g: string) {
    const t = sacramentFor(g);
    if (!t) return setC({ ...c, grade: g, sacrament: null });
    setC({
      ...c,
      grade: g,
      sacrament: c.sacrament
        ? { ...c.sacrament, type: t }
        : { type: t, sponsor_name: null, lessons_place: null, celebration_place: null },
    });
  }

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await updateDoc(doc(db, "registrations", reg.id), {
        ...f,
        father_name: f.father_name || null,
        father_phone: f.father_phone || null,
        mother_name: f.mother_name || null,
        mother_phone: f.mother_phone || null,
        postal_code: f.postal_code || null,
        children: reg.children.map((x) =>
          x.id === child.id
            ? {
                ...c,
                allergy_details: c.has_allergy ? c.allergy_details || null : null,
                other_condition: c.other_condition || null,
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

  const sac = c.sacrament;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>تعديل بيانات {child.full_name}</h2>
        <p className="hint" style={{ marginTop: "-0.6rem" }}>
          تعديل بيانات الأهل والعنوان ينطبق على جميع أطفال العائلة نفسها.
        </p>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="field">
            <label>الاسم الثلاثي</label>
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
          <div className="two-up">
            <div className="field">
              <label>الصف / المرحلة</label>
              <select value={c.grade} onChange={(e) => setGrade(e.target.value)}>
                {GRADES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>الجنس</label>
              <select value={c.gender} onChange={(e) => setC({ ...c, gender: e.target.value as any })}>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>

          {sac && (
            <div className="sacrament-box" style={{ marginBottom: "1.05rem" }}>
              <h4>سرّ {SACRAMENT_LABEL[sac.type]}</h4>
              <div className="field">
                <label>اسم الإشبين / الإشبينة</label>
                <input type="text" value={sac.sponsor_name ?? ""}
                  onChange={(e) => setC({ ...c, sacrament: { ...sac, sponsor_name: e.target.value } })} />
              </div>
              <div className="field">
                <label>مكان الدروس التحضيرية</label>
                <select value={sac.lessons_place ?? ""}
                  onChange={(e) => setC({ ...c, sacrament: { ...sac, lessons_place: (e.target.value || null) as any } })}>
                  <option value="">— غير محدّد —</option>
                  {(Object.keys(LESSONS_LABEL) as (keyof typeof LESSONS_LABEL)[]).map((k) => (
                    <option key={k} value={k}>{LESSONS_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>مكان الاحتفال بالسرّ</label>
                <select value={sac.celebration_place ?? ""}
                  onChange={(e) => setC({ ...c, sacrament: { ...sac, celebration_place: (e.target.value || null) as any } })}>
                  <option value="">— غير محدّد —</option>
                  {(Object.keys(CELEBRATION_LABEL) as (keyof typeof CELEBRATION_LABEL)[]).map((k) => (
                    <option key={k} value={k}>{CELEBRATION_LABEL[k]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <label className="consent" style={{ marginBottom: "1rem" }}>
            <input type="checkbox" checked={c.has_allergy}
              onChange={(e) => setC({ ...c, has_allergy: e.target.checked })} />
            <p>يعاني من حساسية</p>
          </label>
          {c.has_allergy && (
            <div className="field">
              <label>نوع الحساسية</label>
              <input type="text" value={c.allergy_details ?? ""}
                onChange={(e) => setC({ ...c, allergy_details: e.target.value })} />
            </div>
          )}
          <div className="field">
            <label>حالة صحية أخرى</label>
            <input type="text" value={c.other_condition ?? ""}
              onChange={(e) => setC({ ...c, other_condition: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>ملاحظات إضافية</label>
            <textarea value={c.notes ?? ""} onChange={(e) => setC({ ...c, notes: e.target.value })} />
          </div>
        </div>

        <div className="card">
          <div className="two-up">
            <div className="field">
              <label>اسم الأب / وليّ الأمر</label>
              <input type="text" value={f.father_name} onChange={(e) => setF({ ...f, father_name: e.target.value })} />
            </div>
            <div className="field">
              <label>هاتف الأب</label>
              <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={f.father_phone}
                onChange={(e) => setF({ ...f, father_phone: e.target.value })} />
            </div>
          </div>
          <div className="two-up">
            <div className="field">
              <label>اسم الأم / وليّة الأمر</label>
              <input type="text" value={f.mother_name} onChange={(e) => setF({ ...f, mother_name: e.target.value })} />
            </div>
            <div className="field">
              <label>هاتف الأم</label>
              <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={f.mother_phone}
                onChange={(e) => setF({ ...f, mother_phone: e.target.value })} />
            </div>
          </div>
          <div className="two-up">
            <div className="field">
              <label>الرعية</label>
              <input type="text" value={f.parish} onChange={(e) => setF({ ...f, parish: e.target.value })} />
            </div>
            <div className="field">
              <label>هاتف الطوارئ</label>
              <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={f.emergency_phone}
                onChange={(e) => setF({ ...f, emergency_phone: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>البريد الإلكتروني</label>
            <input type="email" dir="ltr" style={{ textAlign: "right" }} value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="two-up">
            <div className="field">
              <label>المدينة</label>
              <input type="text" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            </div>
            <div className="field">
              <label>الشارع</label>
              <input type="text" value={f.street} onChange={(e) => setF({ ...f, street: e.target.value })} />
            </div>
          </div>
          <div className="two-up">
            <div className="field">
              <label>البيت</label>
              <input type="text" value={f.house} onChange={(e) => setF({ ...f, house: e.target.value })} />
            </div>
            <div className="field">
              <label>الرمز البريدي</label>
              <input type="text" dir="ltr" style={{ textAlign: "right" }} value={f.postal_code}
                onChange={(e) => setF({ ...f, postal_code: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>اسم الموقّع</label>
            <input type="text" value={f.signer_name} onChange={(e) => setF({ ...f, signer_name: e.target.value })} />
          </div>
          <label className="consent" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={f.photo_consent}
              onChange={(e) => setF({ ...f, photo_consent: e.target.checked })} />
            <p>موافقة على استخدام الصور</p>
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
