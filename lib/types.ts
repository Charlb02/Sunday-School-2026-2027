export type Gender = "male" | "female";
export type SacramentType = "communion" | "confirmation";
export type LessonsPlace = "beit_hanina" | "old_city";
export type CelebrationPlace = "beit_hanina" | "jerusalem";

export type Sacrament = {
  type: SacramentType;
  sponsor_name: string;
  lessons_place: LessonsPlace;
  celebration_place: CelebrationPlace;
};

export type ChildDoc = {
  id: string;
  full_name: string;      // الاسم الثلاثي
  dob: string;            // yyyy-mm-dd
  school_name: string;
  grade: string;          // key from GRADES
  gender: Gender;
  has_allergy: boolean;
  allergy_details: string | null;
  other_condition: string | null;
  notes: string | null;
  sacrament: Sacrament | null;
};

export type Registration = {
  id: string;
  created_at: string; // ISO
  father_name: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  parish: string;
  email: string;
  city: string;
  street: string;
  house: string;
  postal_code: string | null;
  emergency_phone: string;
  photo_consent: boolean;
  declaration: boolean;
  signer_name: string;
  children: ChildDoc[];
};

export type ChildRow = { child: ChildDoc; reg: Registration };

// ---------------------------------------------------------------
// Grades. To add or rename one, edit this list only — the form,
// the sacrament logic and the export all read from it.
// The two `sacrament` values are what make section 4 appear.
// ---------------------------------------------------------------
export const GRADES: { key: string; label: string; sacrament?: SacramentType }[] = [
  { key: "kg", label: "روضة" },
  { key: "prep", label: "تمهيدي" },
  { key: "1", label: "الصف الأول" },
  { key: "2", label: "الصف الثاني" },
  { key: "3", label: "الصف الثالث" },
  { key: "4", label: "الصف الرابع", sacrament: "communion" },
  { key: "5", label: "الصف الخامس" },
  { key: "6", label: "الصف السادس", sacrament: "confirmation" },
];

export const gradeLabel = (k: string) => GRADES.find((g) => g.key === k)?.label ?? k;
export const sacramentFor = (k: string) => GRADES.find((g) => g.key === k)?.sacrament;

export const SACRAMENT_LABEL: Record<SacramentType, string> = {
  communion: "المناولة الأولى",
  confirmation: "التثبيت",
};

export const LESSONS_LABEL: Record<LessonsPlace, string> = {
  beit_hanina: "مار يعقوب بيت حنينا — أيام الجمعة 4:00 إلى 6:30",
  old_city: "مدرسة الفرير البلدة القديمة — أيام الأحد 9:00 إلى 12:00",
};

export const CELEBRATION_LABEL: Record<CelebrationPlace, string> = {
  beit_hanina: "بيت حنينا — كنيسة مار يعقوب",
  jerusalem: "القدس — دير المخلص",
};

export const GENDER_LABEL: Record<Gender, string> = { male: "ذكر", female: "أنثى" };
