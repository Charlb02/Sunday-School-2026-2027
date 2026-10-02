"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitRegistration } from "./actions";
import { CrossDoves, ChurchBranches } from "./ornaments";
import {
  GRADES,
  sacramentFor,
  SACRAMENT_LABEL,
  LESSONS_LABEL,
  CELEBRATION_LABEL,
  LATIN_RITE_NOTE,
  type Gender,
  type LessonsPlace,
  type CelebrationPlace,
} from "@/lib/types";

const SEC = {
  child: "#cfe4f7",
  parents: "#d5ecd2",
  address: "#fbe6c2",
  sacrament: "#e2d7f3",
  health: "#fad3dd",
  consent: "#cfe9e6",
  notes: "#fdf0c4",
};

type ChildForm = {
  key: number;
  full_name: string;
  dob: string;
  school_name: string;
  grade: string;
  gender: "" | Gender;
  has_allergy: "" | "yes" | "no";
  allergy_details: string;
  other_condition: string;
  notes: string;
  sponsor_name: string;
  lessons_place: "" | LessonsPlace;
  celebration_place: "" | CelebrationPlace;
};

const ORDINALS = [
  "الطفل الأول", "الطفل الثاني", "الطفل الثالث", "الطفل الرابع",
  "الطفل الخامس", "الطفل السادس", "الطفل السابع", "الطفل الثامن",
];

let seq = 1;
const blankChild = (): ChildForm => ({
  key: seq++,
  full_name: "", dob: "", school_name: "", grade: "", gender: "",
  has_allergy: "", allergy_details: "", other_condition: "", notes: "",
  sponsor_name: "", lessons_place: "", celebration_place: "",
});

const NOTES_PLACEHOLDER =
  "مثال: فرط الحركة وتشتت الانتباه (ADHD)، سماعة أذن، نظارة طبية، صعوبة في اللغة العربية، أو أي حاجة أخرى تودّون إعلامنا بها.";

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

function Section({
  n, title, color, hint, children,
}: {
  n: number; title: string; color: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="sec" style={{ ["--sec" as any]: color }}>
      <header className="sec-head">
        <span className="sec-num">{n}</span>
        {title}
      </header>
      <div className="sec-body">
        {hint && <p className="hint">{hint}</p>}
        {children}
      </div>
    </section>
  );
}

export default function RegistrationPage() {
  const router = useRouter();
  const [heroOk, setHeroOk] = useState(true);
  const [children, setChildren] = useState<ChildForm[]>([blankChild()]);

  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [parish, setParish] = useState("");
  const [email, setEmail] = useState("");

  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [postal, setPostal] = useState("");

  const [emergency, setEmergency] = useState("");
  const [photo, setPhoto] = useState<"" | "yes" | "no">("");
  const [declaration, setDeclaration] = useState(false);
  const [signer, setSigner] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const patch = (key: number, p: Partial<ChildForm>) =>
    setChildren((cs) => cs.map((c) => (c.key === key ? { ...c, ...p } : c)));

  function validate() {
    const e: Record<string, string> = {};
    children.forEach((c, i) => {
      if (c.full_name.trim().length < 2) e[`c${i}.full_name`] = "يرجى كتابة الاسم الثلاثي";
      if (!c.dob) e[`c${i}.dob`] = "يرجى إدخال تاريخ الميلاد";
      else {
        const a = ageOn(c.dob);
        if (a === null || a < 4 || a > 12)
          e[`c${i}.dob`] = "هذا النشاط مخصص للأطفال من عمر 4 إلى 12 سنة";
      }
      if (c.school_name.trim().length < 2) e[`c${i}.school_name`] = "يرجى كتابة اسم المدرسة";
      if (!c.grade) e[`c${i}.grade`] = "يرجى اختيار الصف";
      if (!c.gender) e[`c${i}.gender`] = "يرجى اختيار الجنس";
      if (c.has_allergy === "") e[`c${i}.has_allergy`] = "يرجى اختيار نعم أو لا";
      if (c.has_allergy === "yes" && c.allergy_details.trim().length < 2)
        e[`c${i}.allergy_details`] = "يرجى تحديد نوع الحساسية";
      if (sacramentFor(c.grade)) {
        if (c.sponsor_name.trim().length < 2) e[`c${i}.sponsor`] = "يرجى إدخال اسم الإشبين/الإشبينة";
        if (!c.lessons_place) e[`c${i}.lessons`] = "يرجى اختيار مكان الدروس التحضيرية";
        if (!c.celebration_place) e[`c${i}.celebration`] = "يرجى اختيار مكان الاحتفال بالسر";
      }
    });

    const fatherOk = fatherName.trim().length > 1 && fatherPhone.trim().length > 5;
    const motherOk = motherName.trim().length > 1 && motherPhone.trim().length > 5;
    if (!fatherOk && !motherOk)
      e.parents = "يرجى إدخال اسم ورقم هاتف أحد الوالدين على الأقل";
    if (parish.trim().length < 2) e.parish = "يرجى كتابة اسم الرعية";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "البريد الإلكتروني غير صحيح";
    if (city.trim().length < 2) e.city = "يرجى كتابة المدينة";
    if (street.trim().length < 2) e.street = "يرجى كتابة الشارع";
    if (house.trim().length < 1) e.house = "يرجى كتابة رقم البيت";
    if (emergency.trim().length < 6) e.emergency = "يرجى إدخال رقم هاتف للطوارئ";
    if (photo === "") e.photo = "يرجى اختيار نعم أو لا";
    if (!declaration) e.declaration = "يجب الإقرار بصحة المعلومات لإتمام التسجيل";
    if (signer.trim().length < 2) e.signer = "يرجى كتابة اسم الموقّع";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setBanner("يرجى مراجعة الحقول المظللة بالأحمر قبل الإرسال.");
      document.querySelector(".invalid")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setBanner("");
    setBusy(true);
    const res = await submitRegistration({
      father_name: fatherName, father_phone: fatherPhone,
      mother_name: motherName, mother_phone: motherPhone,
      parish, email, city, street, house, postal_code: postal,
      emergency_phone: emergency,
      photo_consent: photo === "yes",
      declaration, signer_name: signer,
      children: children.map((c) => {
        const t = sacramentFor(c.grade);
        return {
          full_name: c.full_name, dob: c.dob, school_name: c.school_name,
          grade: c.grade, gender: c.gender as Gender,
          has_allergy: c.has_allergy === "yes",
          allergy_details: c.allergy_details,
          other_condition: c.other_condition,
          notes: c.notes,
          sacrament: t
            ? {
                type: t,
                sponsor_name: c.sponsor_name || null,
                lessons_place: (c.lessons_place || null) as LessonsPlace | null,
                celebration_place: (c.celebration_place || null) as CelebrationPlace | null,
              }
            : null,
        };
      }),
    });
    setBusy(false);
    if (res.ok) router.push("/success");
    else setBanner(res.message);
  }

  const cls = (k: string) => (errors[k] ? "invalid" : "");

  return (
    <>
      <header className="masthead">
        {heroOk && (
          <img src="/hero.png" alt="" className="hero-img" onError={() => setHeroOk(false)} />
        )}
        <CrossDoves />
        <h1>
          استمارة تسجيل
          <span className="year" style={{ fontSize: "0.78em", color: "#fff" }}>
            مدرسة الأحد
          </span>
        </h1>
        <p className="verse">
          «دعوا الأولاد يأتون إليّ ولا تمنعوهم، لأنّ لمثل هؤلاء ملكوت الله»
          <cite>مرقس 10 : 14</cite>
        </p>
        <p>للأعمار من 4 إلى 12 سنة. تُملأ الاستمارة من قِبل أحد الوالدين أو وليّ الأمر.</p>
      </header>

      <main className="shell">
        <form onSubmit={onSubmit} noValidate>
          {/* 1 — children */}
          <Section
            n={1}
            title="معلومات الطفل / الطفلة"
            color={SEC.child}
            hint="يمكنكم تسجيل أكثر من طفل في استمارة واحدة باستخدام زر «إضافة طفل»."
          >
            {children.map((c, i) => {
              const sac = sacramentFor(c.grade);
              return (
                <div className="card child-card" key={c.key}>
                  <header>
                    <span className="index">
                      <span>{i + 1}</span>
                      {ORDINALS[i] ?? `الطفل رقم ${i + 1}`}
                    </span>
                    {children.length > 1 && (
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setChildren((cs) => cs.filter((x) => x.key !== c.key))}
                      >
                        حذف
                      </button>
                    )}
                  </header>

                  <div className="field">
                    <label><span className="req">*</span> الاسم الثلاثي</label>
                    <input type="text" className={cls(`c${i}.full_name`)} value={c.full_name}
                      onChange={(e) => patch(c.key, { full_name: e.target.value })}
                      placeholder="الاسم، اسم الأب، اسم العائلة" />
                    {errors[`c${i}.full_name`] && <p className="err">{errors[`c${i}.full_name`]}</p>}
                  </div>

                  <div className="two-up">
                    <div className="field">
                      <label><span className="req">*</span> تاريخ الميلاد</label>
                      <input type="date" className={cls(`c${i}.dob`)} value={c.dob}
                        onChange={(e) => patch(c.key, { dob: e.target.value })} />
                      {errors[`c${i}.dob`] ? (
                        <p className="err">{errors[`c${i}.dob`]}</p>
                      ) : (
                        ageOn(c.dob) !== null && (
                          <p className="hint" style={{ margin: "0.3rem 0 0" }}>العمر: {ageOn(c.dob)} سنة</p>
                        )
                      )}
                    </div>
                    <div className="field">
                      <label><span className="req">*</span> المدرسة</label>
                      <input type="text" className={cls(`c${i}.school_name`)} value={c.school_name}
                        onChange={(e) => patch(c.key, { school_name: e.target.value })} />
                      {errors[`c${i}.school_name`] && <p className="err">{errors[`c${i}.school_name`]}</p>}
                    </div>
                  </div>

                  <div className="two-up">
                    <div className="field">
                      <label><span className="req">*</span> الصف / المرحلة</label>
                      <select className={cls(`c${i}.grade`)} value={c.grade}
                        onChange={(e) => patch(c.key, { grade: e.target.value })}>
                        <option value="">— اختيار —</option>
                        {GRADES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                      </select>
                      {errors[`c${i}.grade`] && <p className="err">{errors[`c${i}.grade`]}</p>}
                    </div>
                    <div className="field">
                      <label><span className="req">*</span> الجنس</label>
                      <div className="choices">
                        <label className="choice">
                          <input type="radio" name={`g-${c.key}`} checked={c.gender === "male"}
                            onChange={() => patch(c.key, { gender: "male" })} />ذكر
                        </label>
                        <label className="choice">
                          <input type="radio" name={`g-${c.key}`} checked={c.gender === "female"}
                            onChange={() => patch(c.key, { gender: "female" })} />أنثى
                        </label>
                      </div>
                      {errors[`c${i}.gender`] && <p className="err">{errors[`c${i}.gender`]}</p>}
                    </div>
                  </div>

                  {/* 4 — sacrament, only for grades that have one */}
                  {sac && (
                    <div className="sacrament-box">
                      <h4>الاستعداد لنيل سرّ {SACRAMENT_LABEL[sac]}</h4>
                      <p className="hint">
                        يظهر هذا القسم لأنّ الطفل في {GRADES.find((g) => g.key === c.grade)?.label}.
                      </p>
                      <p className="rite-note">{LATIN_RITE_NOTE}</p>

                      <div className="field">
                        <label>اسم الإشبين / الإشبينة</label>
                        <input type="text" value={c.sponsor_name}
                          onChange={(e) => patch(c.key, { sponsor_name: e.target.value })} />
                      </div>

                      <div className="field">
                        <label>المكان المرغوب للالتزام بالدروس التحضيرية</label>
                        <div className="choices-stack">
                          {(Object.keys(LESSONS_LABEL) as LessonsPlace[]).map((k) => (
                            <label className="choice" key={k}>
                              <input type="radio" name={`lp-${c.key}`} checked={c.lessons_place === k}
                                onChange={() => patch(c.key, { lessons_place: k })} />
                              <span>
                                {LESSONS_LABEL[k].split(" — ")[0]}
                                <small>{LESSONS_LABEL[k].split(" — ")[1]}</small>
                              </span>
                            </label>
                          ))}
                        </div>
                        {c.lessons_place && (
                          <button type="button" className="btn-link clear-link"
                            onClick={() => patch(c.key, { lessons_place: "" })}>
                            مسح الاختيار
                          </button>
                        )}
                      </div>

                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>المكان المرغوب للاحتفال بالسرّ المقدّس</label>
                        <div className="choices-stack">
                          {(Object.keys(CELEBRATION_LABEL) as CelebrationPlace[]).map((k) => (
                            <label className="choice" key={k}>
                              <input type="radio" name={`cp-${c.key}`} checked={c.celebration_place === k}
                                onChange={() => patch(c.key, { celebration_place: k })} />
                              {CELEBRATION_LABEL[k]}
                            </label>
                          ))}
                        </div>
                        {c.celebration_place && (
                          <button type="button" className="btn-link clear-link"
                            onClick={() => patch(c.key, { celebration_place: "" })}>
                            مسح الاختيار
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* health, per child */}
                  <div className="field" style={{ marginTop: "1.05rem" }}>
                    <label><span className="req">*</span> هل يعاني الطفل من أي نوع من الحساسية؟</label>
                    <div className="choices">
                      <label className="choice">
                        <input type="radio" name={`a-${c.key}`} checked={c.has_allergy === "yes"}
                          onChange={() => patch(c.key, { has_allergy: "yes" })} />نعم
                      </label>
                      <label className="choice">
                        <input type="radio" name={`a-${c.key}`} checked={c.has_allergy === "no"}
                          onChange={() => patch(c.key, { has_allergy: "no", allergy_details: "" })} />لا
                      </label>
                    </div>
                    {errors[`c${i}.has_allergy`] && <p className="err">{errors[`c${i}.has_allergy`]}</p>}
                  </div>

                  {c.has_allergy === "yes" && (
                    <div className="field">
                      <label><span className="req">*</span> يرجى التوضيح</label>
                      <input type="text" className={cls(`c${i}.allergy_details`)} value={c.allergy_details}
                        onChange={(e) => patch(c.key, { allergy_details: e.target.value })}
                        placeholder="مثال: حساسية من المكسرات، اللاكتوز، لدغ النحل…" />
                      {errors[`c${i}.allergy_details`] && <p className="err">{errors[`c${i}.allergy_details`]}</p>}
                    </div>
                  )}

                  <div className="field">
                    <label>هل يعاني الطفل من أي حالة صحية أخرى؟ <span className="optional">(اختياري)</span></label>
                    <input type="text" value={c.other_condition}
                      onChange={(e) => patch(c.key, { other_condition: e.target.value })}
                      placeholder="مثال: الربو، مشكلة في القلب، السكري…" />
                  </div>

                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>ملاحظات واحتياجات خاصة <span className="optional">(اختياري)</span></label>
                    <textarea value={c.notes} onChange={(e) => patch(c.key, { notes: e.target.value })}
                      placeholder={NOTES_PLACEHOLDER} />
                  </div>
                </div>
              );
            })}

            <button type="button" className="btn btn-ghost"
              onClick={() => setChildren((cs) => [...cs, blankChild()])}>
              + إضافة طفل
            </button>
          </Section>

          {/* 2 — parents */}
          <Section n={2} title="معلومات الأهل / وليّ الأمر" color={SEC.parents}
            hint="يكفي إدخال بيانات أحد الوالدين، ويُفضّل إدخال الاثنين إن أمكن.">
            <div className="two-up">
              <div className="field">
                <label>اسم الأب / وليّ الأمر</label>
                <input type="text" className={cls("parents")} value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)} />
              </div>
              <div className="field">
                <label>رقم هاتف الأب</label>
                <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)} />
              </div>
            </div>
            <div className="two-up">
              <div className="field">
                <label>اسم الأم / وليّة الأمر</label>
                <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
              </div>
              <div className="field">
                <label>رقم هاتف الأم</label>
                <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)} />
              </div>
            </div>
            {errors.parents && <p className="err" style={{ marginTop: "-0.5rem" }}>{errors.parents}</p>}

            <div className="two-up">
              <div className="field">
                <label><span className="req">*</span> الرعية</label>
                <input type="text" className={cls("parish")} value={parish}
                  onChange={(e) => setParish(e.target.value)} />
                {errors.parish && <p className="err">{errors.parish}</p>}
              </div>
              <div className="field">
                <label><span className="req">*</span> البريد الإلكتروني</label>
                <input type="email" dir="ltr" style={{ textAlign: "right" }} className={cls("email")}
                  value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.email && <p className="err">{errors.email}</p>}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label><span className="req">*</span> رقم هاتف للطوارئ</label>
              <input type="tel" dir="ltr" style={{ textAlign: "right" }} className={cls("emergency")}
                value={emergency} onChange={(e) => setEmergency(e.target.value)} />
              {errors.emergency && <p className="err">{errors.emergency}</p>}
            </div>
          </Section>

          {/* 3 — address */}
          <Section n={3} title="عنوان السكن بالتفصيل" color={SEC.address}>
            <div className="two-up">
              <div className="field">
                <label><span className="req">*</span> المدينة</label>
                <input type="text" className={cls("city")} value={city} onChange={(e) => setCity(e.target.value)} />
                {errors.city && <p className="err">{errors.city}</p>}
              </div>
              <div className="field">
                <label><span className="req">*</span> الشارع</label>
                <input type="text" className={cls("street")} value={street} onChange={(e) => setStreet(e.target.value)} />
                {errors.street && <p className="err">{errors.street}</p>}
              </div>
            </div>
            <div className="two-up" style={{ marginBottom: 0 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label><span className="req">*</span> البيت</label>
                <input type="text" className={cls("house")} value={house} onChange={(e) => setHouse(e.target.value)} />
                {errors.house && <p className="err">{errors.house}</p>}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>الرمز البريدي <span className="optional">(اختياري)</span></label>
                <input type="text" dir="ltr" style={{ textAlign: "right" }} value={postal}
                  onChange={(e) => setPostal(e.target.value)} />
              </div>
            </div>
          </Section>

          {/* 4 — consent */}
          <Section n={4} title="موافقة وليّ الأمر" color={SEC.consent}>
            <div className="field">
              <label><span className="req">*</span> استخدام الصور</label>
              <p className="hint" style={{ marginBottom: "0.6rem" }}>
                هل تعطون الكنيسة الإذن باستخدام صور ابنكم / ابنتكم في الأنشطة الكنسية
                وللأغراض الكنسية فقط؟
              </p>
              <div className="choices">
                <label className="choice">
                  <input type="radio" name="photo" checked={photo === "yes"} onChange={() => setPhoto("yes")} />
                  نعم، أوافق
                </label>
                <label className="choice">
                  <input type="radio" name="photo" checked={photo === "no"} onChange={() => setPhoto("no")} />
                  لا، لا أوافق
                </label>
              </div>
              {errors.photo && <p className="err">{errors.photo}</p>}
            </div>

            <div className="field">
              <label className={`consent ${errors.declaration ? "invalid" : ""}`}>
                <input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} />
                <p>
                  <span className="req">*</span> أُقرّ أنا الموقّع أدناه بأنّ جميع المعلومات
                  المذكورة أعلاه صحيحة، وأوافق على مشاركة ابني / ابنتي في أنشطة مدرسة الأحد.
                </p>
              </label>
              {errors.declaration && <p className="err">{errors.declaration}</p>}
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label><span className="req">*</span> اسم الموقّع</label>
              <input type="text" className={cls("signer")} value={signer}
                onChange={(e) => setSigner(e.target.value)} />
              {errors.signer ? (
                <p className="err">{errors.signer}</p>
              ) : (
                <p className="hint" style={{ margin: "0.3rem 0 0" }}>
                  يُسجَّل تاريخ ووقت الإرسال تلقائياً مع الاستمارة.
                </p>
              )}
            </div>
          </Section>

          <div className="submit-row">
            {banner && <p className="err" role="alert" style={{ margin: 0 }}>{banner}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "جارٍ الإرسال…" : "إرسال التسجيل"}
            </button>
            <p className="hint" style={{ textAlign: "center", margin: 0 }}>
              الحقول المعلّمة بـ <span className="req">*</span> مطلوبة. تُحفظ بياناتكم لدى
              مسؤولي مدرسة الأحد وتُستخدم لأغراض النشاط فقط.
            </p>
          </div>

          <p className="thanks">
            شكرًا لكم على ثقتكم بنا،
            <br />
            نصلّي من أجل أبنائكم.
          </p>
          <ChurchBranches />
        </form>
      </main>
    </>
  );
}
