import { supabase } from "@/integrations/supabase/client";

export const AGENDA_STATUS = ["Akan Datang", "Berlangsung", "Selesai", "Dibatalkan"] as const;
export type AgendaStatus = (typeof AGENDA_STATUS)[number];

export interface Agenda {
  id: string;
  judul: string;
  tanggal: string;
  jam: string;
  tempat: string;
  deskripsi: string | null;
  status: AgendaStatus;
  disetujui: boolean;
  arsip: boolean;
  dibuat_oleh: string | null;
  created_at: string;
}

export const MARQUEE_SPEED_KEY = "sirt06.agenda.marquee.speed";
export const DEFAULT_MARQUEE_SPEED = 26; // detik per putaran

export function readMarqueeSpeed(): number {
  if (typeof window === "undefined") return DEFAULT_MARQUEE_SPEED;
  const raw = Number(window.localStorage.getItem(MARQUEE_SPEED_KEY));
  return Number.isFinite(raw) && raw >= 8 && raw <= 60 ? raw : DEFAULT_MARQUEE_SPEED;
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function parseTanggal(t: string): Date {
  const [y, m, d] = t.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function hariDari(t: string): string {
  return HARI[parseTanggal(t).getDay()] ?? "";
}

export function tanggalPanjang(t: string): string {
  const d = parseTanggal(t);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function agendaText(a: Agenda): string {
  return `${hariDari(a.tanggal)}, ${tanggalPanjang(a.tanggal)} | ${a.judul} | Pukul ${a.jam} WIB | ${a.tempat || "-"}`;
}

export function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function selisihHari(tanggal: string): number {
  return Math.round((parseTanggal(tanggal).getTime() - startOfDay().getTime()) / 86400000);
}

export async function fetchAgenda(): Promise<Agenda[]> {
  const { data, error } = await supabase
    .from("agenda")
    .select("*")
    .order("tanggal", { ascending: true })
    .order("jam", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Agenda[];
}
