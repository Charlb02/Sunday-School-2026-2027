"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const ar = {
  required: "هذا الحقل مطلوب",
  email: "البريد الإلكتروني غير صحيح",
  dob: "تاريخ الميلاد غير صحيح",
  age: "هذا النشاط مخصص للأطفال من عمر 3 إلى 12 سنة",
  allergy: "يرجى تحديد نوع الحساسية",
  mass: "يجب الموافقة على البقاء في القداس لإتمام التسجيل",
  photo: "يرجى اختيار نعم أو لا",
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

const childSchema = z
  .object({
    full_name: z.string().trim().min(2, ar.required),
    dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), ar.dob),
    school_name: z.string().trim().min(2, ar.required),
    has_allergy: z.boolean(),
    allergy_details: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((c) => !c.has_allergy || (c.allergy_details ?? "").length > 1, {
    message: ar.allergy,
    path: ["allergy_details"],
  })
  .refine((c) => ageOn(c.dob) >= 3 && ageOn(c.dob) <= 12, {
    message: ar.age,
    path: ["dob"],
  });

const registrationSchema = z.object({
  parent1_name: z.string().trim().min(2, ar.required),
  parent2_name: z.string().trim().optional().nullable(),
  address: z.string().trim().min(5, ar.required),
  phone1: z.string().trim().min(6, ar.required),
  phone2: z.string().trim().optional().nullable(),
  email: z.string().trim().email(ar.email),
  photo_consent: z.boolean({ required_error: ar.photo }),
  mass_consent: z.literal(true, { errorMap: () => ({ message: ar.mass }) }),
  children: z.array(childSchema).min(1, ar.noChildren),
});

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
    // One atomic write. No chance of a half-saved registration.
    await adminDb()
      .collection("registrations")
      .add({
        created_at: FieldValue.serverTimestamp(),
        parent1_name: d.parent1_name,
        parent2_name: d.parent2_name || null,
        address: d.address,
        phone1: d.phone1,
        phone2: d.phone2 || null,
        email: d.email,
        photo_consent: d.photo_consent,
        mass_consent: d.mass_consent,
        children: d.children.map((c) => ({
          id: randomUUID(),
          full_name: c.full_name,
          dob: c.dob,
          school_name: c.school_name,
          has_allergy: c.has_allergy,
          allergy_details: c.has_allergy ? c.allergy_details || null : null,
          notes: c.notes || null,
        })),
      });
  } catch (e) {
    console.error("registration write failed", e);
    return { ok: false as const, message: "تعذّر حفظ التسجيل. يرجى المحاولة مرة أخرى." };
  }

  return { ok: true as const, count: d.children.length };
}
