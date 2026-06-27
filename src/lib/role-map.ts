import type { Role } from "./auth-context";

export type Jabatan =
  | "super_admin" | "ketua_rt" | "sekretaris" | "bendahara_1" | "bendahara_2"
  | "humas" | "keamanan_1" | "keamanan_2" | "sie_perlengkapan"
  | "sie_kematian" | "sie_umum" | "warga";

export const JABATAN_LIST: Jabatan[] = [
  "super_admin","ketua_rt","sekretaris","bendahara_1","bendahara_2",
  "humas","keamanan_1","keamanan_2","sie_perlengkapan","sie_kematian",
  "sie_umum","warga",
];

export const JABATAN_LABEL: Record<Jabatan, Role> = {
  super_admin: "Super Admin",
  ketua_rt: "Ketua RT",
  sekretaris: "Sekretaris",
  bendahara_1: "Bendahara 1",
  bendahara_2: "Bendahara 2",
  humas: "Humas",
  keamanan_1: "Keamanan 1",
  keamanan_2: "Keamanan 2",
  sie_perlengkapan: "Sie Perlengkapan",
  sie_kematian: "Sie Kematian",
  sie_umum: "Sie Umum",
  warga: "Warga",
};

export const LABEL_TO_JABATAN: Record<string, Jabatan> = Object.fromEntries(
  Object.entries(JABATAN_LABEL).map(([k, v]) => [v, k as Jabatan]),
) as Record<string, Jabatan>;

export function jabatanToLabel(j: Jabatan): Role {
  return JABATAN_LABEL[j];
}
export function labelToJabatan(label: string): Jabatan {
  return LABEL_TO_JABATAN[label] ?? "warga";
}