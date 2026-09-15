"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitRegistration } from "./actions";

type ChildForm = {
  key: number;
  full_name: string;
  dob: string;
  school_name: string;
  has_allergy: "" | "yes" | "no";
  allergy_details: string;
  notes: string;
};

const ORDINALS = [
  "الطفل الأول", "الطفل الثاني", "الطفل الثالث", "الطفل الرابع",
  "الطفل الخامس", "الطفل السادس", "الطفل السابع", "الطفل الثامن",
];

let seq = 1;
const blankChild = (): ChildForm => ({
  key: seq++,
  full_name: "",
  dob: "",
  school_name: "",
  has_allergy: "",
  allergy_details: "",
  notes: "",
});

const NOTES_PLACEHOLDER =
  "مثال: مشكلة في القلب، الربو، فرط الحركة وتشتت الانتباه (ADHD)، سماعة أذن، نظارة طبية، صعوبة في اللغة العربية، أو أي حاجة أخرى تودّون إعلامنا بها.";

function ageOn(dob: string): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export default function RegistrationPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildForm[]>([blankChild()]);
  const [parent1, setParent1] = useState("");
  const [parent2, setParent2] = useState("");
  const [address, setAddress] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<"" | "yes" | "no">("");
  const [mass, setMass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const patchChild = (key: number, patch: Partial<ChildForm>) =>
    setChildren((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const addChild = () => setChildren((cs) => [...cs, blankChild()]);
  const removeChild = (key: number) =>
    setChildren((cs) => cs.filter((c) => c.key !== key));

  function validate() {
    const e: Record<string, string> = {};
    children.forEach((c, i) => {
      if (c.full_name.trim().length < 2) e[`c${i}.full_name`] = "يرجى كتابة الاسم الكامل";
      if (!c.dob) e[`c${i}.dob`] = "يرجى إدخال تاريخ الميلاد";
      else {
        const age = ageOn(c.dob);
        if (age === null || age < 3 || age > 12)
          e[`c${i}.dob`] = "هذا النشاط مخصص للأطفال من عمر 3 إلى 12 سنة";
      }
      if (c.school_name.trim().length < 2) e[`c${i}.school_name`] = "يرجى كتابة اسم المدرسة";
      if (c.has_allergy === "") e[`c${i}.has_allergy`] = "يرجى اختيار نعم أو لا";
      if (c.has_allergy === "yes" && c.allergy_details.trim().length < 2)
        e[`c${i}.allergy_details`] = "يرجى تحديد نوع الحساسية";
    });
    if (parent1.trim().length < 2) e.parent1 = "يرجى كتابة الاسم الكامل";
    if (address.trim().length < 5) e.address = "يرجى كتابة العنوان كاملاً مع اسم الشارع ورقم المنزل";
    if (phone1.trim().length < 6) e.phone1 = "يرجى إدخال رقم هاتف صحيح";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "البريد الإلكتروني غير صحيح";
    if (photo === "") e.photo = "يرجى اختيار نعم أو لا";
    if (!mass) e.mass = "يجب الموافقة على هذا البند لإتمام التسجيل";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setBanner("يرجى مراجعة الحقول المظللة بالأحمر قبل الإرسال.");
      document.querySelector(".invalid")?.scrollIntoView({ block: "center" });
      return;
    }
    setBanner("");
    setBusy(true);
    const res = await submitRegistration({
      parent1_name: parent1,
      parent2_name: parent2,
      address,
      phone1,
      phone2,
      email,
      photo_consent: photo === "yes",
      mass_consent: mass,
      children: children.map((c) => ({
        full_name: c.full_name,
        dob: c.dob,
        school_name: c.school_name,
        has_allergy: c.has_allergy === "yes",
        allergy_details: c.allergy_details,
        notes: c.notes,
      })),
    });
    setBusy(false);
    if (res.ok) router.push("/success");
    else setBanner(res.message);
  }

  const cls = (k: string) => (errors[k] ? "invalid" : "");

  return (
    <>
      <header className="masthead">
        <h1>
          الرسل الصغار
          <span className="year">٢٠٢٦</span>
        </h1>
        <p>
          استمارة تسجيل الأطفال في نشاطات مدرسة الأحد، للأعمار من 3 إلى 12 سنة.
          تُملأ الاستمارة من قِبل أحد الوالدين.
        </p>
      </header>

      <main className="shell">
        <form onSubmit={onSubmit} noValidate>
          {/* ---------------- children ---------------- */}
          <section className="section" style={{ marginTop: "1.5rem" }}>
            <h2>بيانات الأطفال</h2>
            <p className="hint">
              يمكنكم تسجيل أكثر من طفل في استمارة واحدة باستخدام زر «إضافة طفل».
            </p>

            {children.map((c, i) => (
              <div className="card child-card" key={c.key}>
                <header>
                  <span className="index">
                    <span>{i + 1}</span>
                    {ORDINALS[i] ?? `الطفل رقم ${i + 1}`}
                  </span>
                  {children.length > 1 && (
                    <button type="button" className="btn-link" onClick={() => removeChild(c.key)}>
                      حذف
                    </button>
                  )}
                </header>

                <div className="field">
                  <label>
                    <span className="req">*</span> الاسم الكامل للطفل
                  </label>
                  <input
                    type="text"
                    className={cls(`c${i}.full_name`)}
                    value={c.full_name}
                    onChange={(e) => patchChild(c.key, { full_name: e.target.value })}
                    placeholder="الاسم الأول واسم العائلة"
                  />
                  {errors[`c${i}.full_name`] && <p className="err">{errors[`c${i}.full_name`]}</p>}
                </div>

                <div className="two-up">
                  <div className="field">
                    <label>
                      <span className="req">*</span> تاريخ الميلاد
                    </label>
                    <input
                      type="date"
                      className={cls(`c${i}.dob`)}
                      value={c.dob}
                      onChange={(e) => patchChild(c.key, { dob: e.target.value })}
                    />
                    {errors[`c${i}.dob`] ? (
                      <p className="err">{errors[`c${i}.dob`]}</p>
                    ) : (
                      ageOn(c.dob) !== null && (
                        <p className="hint" style={{ margin: "0.3rem 0 0" }}>
                          العمر: {ageOn(c.dob)} سنة
                        </p>
                      )
                    )}
                  </div>

                  <div className="field">
                    <label>
                      <span className="req">*</span> اسم المدرسة
                    </label>
                    <input
                      type="text"
                      className={cls(`c${i}.school_name`)}
                      value={c.school_name}
                      onChange={(e) => patchChild(c.key, { school_name: e.target.value })}
                    />
                    {errors[`c${i}.school_name`] && (
                      <p className="err">{errors[`c${i}.school_name`]}</p>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label>
                    <span className="req">*</span> هل يعاني الطفل من حساسية؟
                  </label>
                  <div className="choices">
                    <label className="choice">
                      <input
                        type="radio"
                        name={`allergy-${c.key}`}
                        checked={c.has_allergy === "yes"}
                        onChange={() => patchChild(c.key, { has_allergy: "yes" })}
                      />
                      نعم
                    </label>
                    <label className="choice">
                      <input
                        type="radio"
                        name={`allergy-${c.key}`}
                        checked={c.has_allergy === "no"}
                        onChange={() =>
                          patchChild(c.key, { has_allergy: "no", allergy_details: "" })
                        }
                      />
                      لا
                    </label>
                  </div>
                  {errors[`c${i}.has_allergy`] && (
                    <p className="err">{errors[`c${i}.has_allergy`]}</p>
                  )}
                </div>

                {c.has_allergy === "yes" && (
                  <div className="field">
                    <label>
                      <span className="req">*</span> نوع الحساسية
                    </label>
                    <input
                      type="text"
                      className={cls(`c${i}.allergy_details`)}
                      value={c.allergy_details}
                      onChange={(e) => patchChild(c.key, { allergy_details: e.target.value })}
                      placeholder="مثال: حساسية من المكسرات، اللاكتوز، لدغ النحل..."
                    />
                    {errors[`c${i}.allergy_details`] && (
                      <p className="err">{errors[`c${i}.allergy_details`]}</p>
                    )}
                  </div>
                )}

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>
                    ملاحظات أو احتياجات خاصة <span className="optional">(اختياري)</span>
                  </label>
                  <textarea
                    value={c.notes}
                    onChange={(e) => patchChild(c.key, { notes: e.target.value })}
                    placeholder={NOTES_PLACEHOLDER}
                  />
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-ghost" onClick={addChild}>
              + إضافة طفل
            </button>
          </section>

          {/* ---------------- parents ---------------- */}
          <section className="section">
            <h2>بيانات الوالدين</h2>
            <p className="hint">نستخدم هذه البيانات للتواصل معكم في كل ما يخص النشاط.</p>

            <div className="card">
              <div className="two-up">
                <div className="field">
                  <label>
                    <span className="req">*</span> الاسم الكامل لوليّ الأمر الأول
                  </label>
                  <input
                    type="text"
                    className={cls("parent1")}
                    value={parent1}
                    onChange={(e) => setParent1(e.target.value)}
                  />
                  {errors.parent1 && <p className="err">{errors.parent1}</p>}
                </div>
                <div className="field">
                  <label>
                    الاسم الكامل لوليّ الأمر الثاني <span className="optional">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={parent2}
                    onChange={(e) => setParent2(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>
                  <span className="req">*</span> العنوان الكامل
                </label>
                <input
                  type="text"
                  className={cls("address")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المدينة، الحي، اسم الشارع، رقم البناية/المنزل"
                />
                {errors.address && <p className="err">{errors.address}</p>}
              </div>

              <div className="two-up">
                <div className="field">
                  <label>
                    <span className="req">*</span> رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    className={cls("phone1")}
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value)}
                  />
                  {errors.phone1 && <p className="err">{errors.phone1}</p>}
                </div>
                <div className="field">
                  <label>
                    رقم هاتف إضافي <span className="optional">(اختياري)</span>
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>
                  <span className="req">*</span> البريد الإلكتروني
                </label>
                <input
                  type="email"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  className={cls("email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="err">{errors.email}</p>}
              </div>
            </div>
          </section>

          {/* ---------------- consents ---------------- */}
          <section className="section">
            <h2>الموافقات</h2>
            <p className="hint">يرجى قراءة البندين التاليين بعناية.</p>

            <div className="field">
              <label>
                <span className="req">*</span> التصوير خلال النشاطات
              </label>
              <p className="hint" style={{ marginBottom: "0.6rem" }}>
                هل توافقون على تصوير أطفالكم خلال نشاطات مدرسة الأحد واستخدام الصور
                ضمن إطار الرعية؟
              </p>
              <div className="choices">
                <label className="choice">
                  <input
                    type="radio"
                    name="photo"
                    checked={photo === "yes"}
                    onChange={() => setPhoto("yes")}
                  />
                  نعم، أوافق
                </label>
                <label className="choice">
                  <input
                    type="radio"
                    name="photo"
                    checked={photo === "no"}
                    onChange={() => setPhoto("no")}
                  />
                  لا، لا أوافق
                </label>
              </div>
              {errors.photo && <p className="err">{errors.photo}</p>}
            </div>

            <div className="field">
              <label className={`consent ${errors.mass ? "invalid" : ""}`}>
                <input type="checkbox" checked={mass} onChange={(e) => setMass(e.target.checked)} />
                <p>
                  <span className="req">*</span> ينتهي يوم النشاط بعد انتهاء القداس الإلهي.
                  أتعهّد بإبقاء أطفالي في القداس وعدم إخراجهم قبل انتهائه، إلا في حالات
                  الطوارئ وبعد إعلام المسؤول عنهم مسبقاً.
                </p>
              </label>
              {errors.mass && <p className="err">{errors.mass}</p>}
            </div>
          </section>

          <div className="submit-row">
            {banner && (
              <p className="err" role="alert" style={{ margin: 0 }}>
                {banner}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "جارٍ الإرسال…" : "إرسال التسجيل"}
            </button>
            <p className="hint" style={{ textAlign: "center", margin: 0 }}>
              الحقول المعلّمة بـ <span className="req">*</span> مطلوبة. تُحفظ بياناتكم
              لدى مسؤولي مدرسة الأحد وتُستخدم لأغراض النشاط فقط.
            </p>
          </div>
        </form>
      </main>
    </>
  );
}
