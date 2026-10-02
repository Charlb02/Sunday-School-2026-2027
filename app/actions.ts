"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { GRADES, sacramentFor } from "@/lib/types";

const ar = {
  required: "هذا الحقل مطلوب",
  email: "البريد الإلكتروني غير صحيح",
  dob: "تاريخ الميلاد غير صحيح",
  age: "هذا النشاط مخصص للأطفال من عمر 4 إلى 12 سنة",
  allergy: "يرجى تحديد نوع الحساسية",
  grade: "يرجى اختيار الصف",
  gender: "يرجى اختيار الجنس",
  parent: "يرجى إدخال اسم ورقم هاتف أحد الوالدين على الأقل",
  declaration: "يجب الإقرار بصحة المعلومات لإتمام التسجيل",
  photo: "يرجى اختيار نعم أو لا",
  sacrament: "يرجى إكمال بيانات سرّ المناولة الأولى أو التثبيت",
  noChildren: "يرجى إضافة طفل واحد على الأقل",
};

function ageOn(dob: string): number {
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// Optional throughout — see the note on Sacrament in lib/types.ts.
const sacramentSchema = z.object({
  type: z.enum(["communion", "confirmation"]),
  sponsor_name: z.string().trim().optional().nullable(),
  lessons_place: z.enum(["beit_hanina", "old_city"]).optional().nullable(),
  celebration_place: z.enum(["beit_hanina", "jerusalem"]).optional().nullable(),
});

const childSchema = z
  .object({
    full_name: z.string().trim().min(2, ar.required),
    dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), ar.dob),
    school_name: z.string().trim().min(2, ar.required),
    grade: z.string().refine((g) => GRADES.some((x) => x.key === g), ar.grade),
    gender: z.enum(["male", "female"], { errorMap: () => ({ message: ar.gender }) }),
    has_allergy: z.boolean(),
    allergy_details: z.string().trim().optional().nullable(),
    other_condition: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    sacrament: sacramentSchema.nullable(),
  })
  .refine((c) => !c.has_allergy || (c.allergy_details ?? "").length > 1, {
    message: ar.allergy,
    path: ["allergy_details"],
  })
  .refine((c) => ageOn(c.dob) >= 4 && ageOn(c.dob) <= 12, {
    message: ar.age,
    path: ["dob"],
  })
  // grades 4 and 6 must carry a sacrament block; other grades must not
  .refine((c) => {
    const expected = sacramentFor(c.grade);
    return expected ? c.sacrament?.type === expected : c.sacrament === null;
  }, { message: ar.sacrament, path: ["sacrament"] });

const registrationSchema = z
  .object({
    father_name: z.string().trim().optional().nullable(),
    father_phone: z.string().trim().optional().nullable(),
    mother_name: z.string().trim().optional().nullable(),
    mother_phone: z.string().trim().optional().nullable(),
    parish: z.string().trim().min(2, ar.required),
    email: z.string().trim().email(ar.email),
    city: z.string().trim().min(2, ar.required),
    street: z.string().trim().min(2, ar.required),
    house: z.string().trim().min(1, ar.required),
    postal_code: z.string().trim().optional().nullable(),
    emergency_phone: z.string().trim().min(6, ar.required),
    photo_consent: z.boolean({ required_error: ar.photo }),
    declaration: z.literal(true, { errorMap: () => ({ message: ar.declaration }) }),
    signer_name: z.string().trim().min(2, ar.required),
    children: z.array(childSchema).min(1, ar.noChildren),
  })
  // at least one complete parent, so single-parent families aren't blocked
  .refine(
    (d) =>
      ((d.father_name ?? "").length > 1 && (d.father_phone ?? "").length > 5) ||
      ((d.mother_name ?? "").length > 1 && (d.mother_phone ?? "").length > 5),
    { message: ar.parent, path: ["father_name"] }
  );

export async function submitRegistration(raw: unknown) {
  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.errors[0]?.message ?? "تعذّر التحقق من البيانات",
    };
  }
  const d = parsed.data;

  try {
    await adminDb()
      .collection("registrations")
      .add({
        created_at: FieldValue.serverTimestamp(),
        father_name: d.father_name || null,
        father_phone: d.father_phone || null,
        mother_name: d.mother_name || null,
        mother_phone: d.mother_phone || null,
        parish: d.parish,
        email: d.email,
        city: d.city,
        street: d.street,
        house: d.house,
        postal_code: d.postal_code || null,
        emergency_phone: d.emergency_phone,
        photo_consent: d.photo_consent,
        declaration: d.declaration,
        signer_name: d.signer_name,
        children: d.children.map((c) => ({
          id: randomUUID(),
          full_name: c.full_name,
          dob: c.dob,
          school_name: c.school_name,
          grade: c.grade,
          gender: c.gender,
          has_allergy: c.has_allergy,
          allergy_details: c.has_allergy ? c.allergy_details || null : null,
          other_condition: c.other_condition || null,
          notes: c.notes || null,
          sacrament: c.sacrament
            ? {
                type: c.sacrament.type,
                sponsor_name: c.sacrament.sponsor_name || null,
                lessons_place: c.sacrament.lessons_place ?? null,
                celebration_place: c.sacrament.celebration_place ?? null,
              }
            : null,
        })),
      });
  } catch (e) {
    console.error("registration write failed", e);
    return { ok: false as const, message: "تعذّر حفظ التسجيل. يرجى المحاولة مرة أخرى." };
  }

  return { ok: true as const, count: d.children.length };
}
