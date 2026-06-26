import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLS } from "./storage";
import type { KasJenis } from "@/routes/keuangan";

export interface RtIdentity {
  namaRT: string;
  nomorRT: string;
  nomorRW: string;
  namaLingkungan: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kodePos: string;
}

export interface PengurusInfo {
  logoRT?: string;
  logoRW?: string;
  ketuaRT: string;
  masaJabatan: string;
  sekretaris: string;
  bendahara1: string;
  bendahara2: string;
  humas: string;
  keamanan1: string;
  keamanan2: string;
  siePerlengkapan: string;
  sieKematian: string;
  sieUmum: string;
}

export interface KontakRT {
  whatsapp: string;
  email: string;
  website: string;
  alamatSekretariat: string;
}

export interface EmergencyKontak {
  id: string;
  kategori: "Internal" | "Instansi";
  label: string;
  nomor: string;
}

export interface AppPrefs {
  bahasa: "id";
  timezone: "WIB";
  formatTanggal: "id";
  mataUang: "IDR";
}

export interface MusikPrefs {
  aktif: boolean;
  volumeAwal: number; // 0-1
}

const KEY_IDENT = "sirt06_settings_identity_v1";
const KEY_PENGURUS = "sirt06_settings_pengurus_v1";
const KEY_KONTAK = "sirt06_settings_kontak_v1";
const KEY_KAS = "sirt06_settings_kas_saldo_v1";
const KEY_EMERG = "sirt06_settings_emergency_v1";
const KEY_APP = "sirt06_settings_app_v1";
const KEY_MUSIK = "sirt06_settings_musik_v1";
const KEY_SETUP = "sirt06_setup_done_v1";

const DEFAULT_IDENT: RtIdentity = {
  namaRT: "RT 06",
  nomorRT: "06",
  nomorRW: "07",
  namaLingkungan: "Bogeman Wetan",
  kelurahan: "",
  kecamatan: "",
  kota: "",
  provinsi: "",
  kodePos: "",
};

const DEFAULT_PENGURUS: PengurusInfo = {
  ketuaRT: "",
  masaJabatan: "",
  sekretaris: "",
  bendahara1: "",
  bendahara2: "",
  humas: "",
  keamanan1: "",
  keamanan2: "",
  siePerlengkapan: "",
  sieKematian: "",
  sieUmum: "",
};

const DEFAULT_KONTAK: KontakRT = {
  whatsapp: "",
  email: "",
  website: "",
  alamatSekretariat: "",
};

const DEFAULT_KAS: Record<KasJenis, number> = {
  "Kas RT": 0,
  "Kas Sosial": 0,
  "Kas HUT RI": 0,
  "Kas Perkakas": 0,
  "Kas Motor Tossa": 0,
};

const DEFAULT_EMERG: EmergencyKontak[] = [
  { id: "e_ketua", kategori: "Internal", label: "Ketua RT", nomor: "" },
  { id: "e_sek", kategori: "Internal", label: "Sekretaris", nomor: "" },
  { id: "e_bend", kategori: "Internal", label: "Bendahara", nomor: "" },
  { id: "e_hum", kategori: "Internal", label: "Humas", nomor: "" },
  { id: "e_kea", kategori: "Internal", label: "Keamanan", nomor: "" },
  { id: "e_damkar", kategori: "Instansi", label: "Damkar", nomor: "113" },
  { id: "e_pmi", kategori: "Instansi", label: "PMI", nomor: "" },
  { id: "e_psc", kategori: "Instansi", label: "PSC 119", nomor: "119" },
  { id: "e_pln", kategori: "Instansi", label: "PLN", nomor: "123" },
  { id: "e_pdam", kategori: "Instansi", label: "PDAM", nomor: "" },
  { id: "e_satpol", kategori: "Instansi", label: "Satpol PP", nomor: "" },
  { id: "e_linmas", kategori: "Instansi", label: "Linmas Kecamatan", nomor: "" },
  { id: "e_polsek", kategori: "Instansi", label: "Polsek Magelang Tengah", nomor: "" },
  { id: "e_polres", kategori: "Instansi", label: "Polres Magelang Kota", nomor: "" },
  { id: "e_bpbd", kategori: "Instansi", label: "BPBD", nomor: "" },
];

const DEFAULT_APP: AppPrefs = {
  bahasa: "id",
  timezone: "WIB",
  formatTanggal: "id",
  mataUang: "IDR",
};

const DEFAULT_MUSIK: MusikPrefs = { aktif: true, volumeAwal: 0.6 };

interface SettingsCtx {
  identity: RtIdentity; setIdentity: (v: RtIdentity) => void;
  pengurus: PengurusInfo; setPengurus: (v: PengurusInfo) => void;
  kontak: KontakRT; setKontak: (v: KontakRT) => void;
  kasSaldoAwal: Record<KasJenis, number>; setKasSaldoAwal: (v: Record<KasJenis, number>) => void;
  emergency: EmergencyKontak[]; setEmergency: (v: EmergencyKontak[]) => void;
  app: AppPrefs; setApp: (v: AppPrefs) => void;
  musik: MusikPrefs; setMusik: (v: MusikPrefs) => void;
  setupDone: boolean; setSetupDone: (v: boolean) => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useLS<RtIdentity>(KEY_IDENT, DEFAULT_IDENT);
  const [pengurus, setPengurus] = useLS<PengurusInfo>(KEY_PENGURUS, DEFAULT_PENGURUS);
  const [kontak, setKontak] = useLS<KontakRT>(KEY_KONTAK, DEFAULT_KONTAK);
  const [kasSaldoAwal, setKasSaldoAwal] = useLS<Record<KasJenis, number>>(KEY_KAS, DEFAULT_KAS);
  const [emergency, setEmergency] = useLS<EmergencyKontak[]>(KEY_EMERG, DEFAULT_EMERG);
  const [app, setApp] = useLS<AppPrefs>(KEY_APP, DEFAULT_APP);
  const [musik, setMusik] = useLS<MusikPrefs>(KEY_MUSIK, DEFAULT_MUSIK);
  const [setupDone, setSetupDone] = useLS<boolean>(KEY_SETUP, false);

  const value = useMemo<SettingsCtx>(() => ({
    identity, setIdentity, pengurus, setPengurus, kontak, setKontak,
    kasSaldoAwal, setKasSaldoAwal, emergency, setEmergency,
    app, setApp, musik, setMusik, setupDone, setSetupDone,
  }), [identity, pengurus, kontak, kasSaldoAwal, emergency, app, musik, setupDone, setIdentity, setPengurus, setKontak, setKasSaldoAwal, setEmergency, setApp, setMusik, setSetupDone]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used within SettingsProvider");
  return v;
}