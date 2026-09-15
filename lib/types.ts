export type ChildDoc = {
  id: string;
  full_name: string;
  dob: string; // yyyy-mm-dd
  school_name: string;
  has_allergy: boolean;
  allergy_details: string | null;
  notes: string | null;
};

// One Firestore document per registration, with the children nested.
// Keeps the whole submission atomic and keeps read counts low.
export type Registration = {
  id: string;
  created_at: string; // ISO
  parent1_name: string;
  parent2_name: string | null;
  address: string;
  phone1: string;
  phone2: string | null;
  email: string;
  photo_consent: boolean;
  mass_consent: boolean;
  children: ChildDoc[];
};

// Flattened for the dashboard table and the Excel export: one entry per child.
export type ChildRow = { child: ChildDoc; reg: Registration };
