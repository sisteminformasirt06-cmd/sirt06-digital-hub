
# Rencana: Modul Super Admin + Migrasi Penuh ke Lovable Cloud

Pengguna memilih **migrasi penuh** seluruh data RT 06 (Warga, KK, Keuangan, Inventaris, Absensi, Pengumuman, Kritik & Saran, Settings, Auth, Audit) dari `localStorage` ke Lovable Cloud (Supabase). Pekerjaan ini besar dan akan dikerjakan **bertahap dalam beberapa giliran**. Desain UI yang sudah ada **tidak akan diubah** — hanya lapisan data + tambahan menu Super Admin.

---

## Tahap 1 — Aktivasi Cloud + Fondasi Auth (giliran ini)

1. **Aktifkan Lovable Cloud** (Supabase).
2. **Skema database** (migration):
   - `app_role` enum: `super_admin, ketua_rt, sekretaris, bendahara_1, bendahara_2, humas, keamanan_1, keamanan_2, sie_perlengkapan, sie_kematian, sie_umum, warga`.
   - `pengurus` — `id (uuid)`, `nama`, `jabatan (app_role)`, `pin_hash`, `aktif`, `harus_ganti_pin`, `gagal_login`, `locked_until`, `last_login_at`, `created_at`, `created_by`.
   - `user_roles` — `id`, `pengurus_id`, `role (app_role)` (pisah dari tabel utama sesuai aturan keamanan).
   - `audit_log` — `id`, `pengurus_id`, `nama`, `role`, `aksi`, `modul`, `detail`, `waktu`, `ip` (nullable).
   - Fungsi `SECURITY DEFINER`: `has_role(_id, _role)`, `verify_pin(_id, _pin)`, `reset_pin(_target_id, _by_id)` → set PIN default `123456` + `harus_ganti_pin=true`, `change_pin(_id, _old, _new)`, `lock_check(_id)`.
   - Seed Super Admin pertama: nama "Super Admin", PIN `000000` (di-hash via `crypt`), `harus_ganti_pin=true`.
   - RLS aktif di semua tabel + GRANT eksplisit ke `authenticated` & `service_role`.
3. **Server functions** (`src/lib/auth.functions.ts`):
   - `loginPin(pin)` → cek lock, verify, set session, audit.
   - `changePin(old, new)` — wajib setelah login pertama.
   - `resetPin(targetId)` — hanya Super Admin.
   - `listPengurus()`, `createPengurus(...)`, `updatePengurus(...)`, `togglePengurus(...)`.
   - `listAuditLog(filter)`.
4. **Client auth-context** dirombak: dari `localStorage` menjadi panggilan server function + session JWT custom (simpan token PIN-session di cookie httpOnly via server-fn).
   - 5x salah PIN → `locked_until = now() + 15m`.
   - `harus_ganti_pin=true` → redirect paksa ke `/ganti-pin`.
5. **Halaman baru**:
   - `/super-admin` — layout + sidebar 7 sub-menu.
   - `/super-admin/dashboard` — statistik sistem.
   - `/super-admin/pengguna` — CRUD pengurus + tombol Reset PIN.
   - `/super-admin/hak-akses` — matriks role → modul (read-only di tahap 1).
   - `/super-admin/identitas` — wrapper ke pengaturan identitas RT.
   - `/super-admin/sistem` — wrapper ke pengaturan aplikasi.
   - `/super-admin/audit-log` — tabel + filter.
   - `/super-admin/backup` — export CSV per tabel.
   - `/ganti-pin` — form ganti PIN wajib.
6. **Nav-config**: tambah item "Super Admin" yang hanya tampil jika `role === 'super_admin'`. Item lain tidak diubah.

## Tahap 2 — Migrasi Settings + Pengumuman + Kritik & Saran (giliran berikutnya)
- Tabel `rt_settings` (single-row), `pengurus_info`, `kontak_rt`, `emergency_kontak`, `kas_saldo_awal`, `app_prefs`, `musik_prefs`.
- Tabel `pengumuman`, `kritik_saran` + storage bucket untuk foto/PDF.
- Refactor `settings-context.tsx` → React Query.

## Tahap 3 — Migrasi Warga, KK, Mutasi
- `kk`, `warga`, `mutasi_warga`.

## Tahap 4 — Migrasi Keuangan
- `kas_jenis`, `kas_transaksi`.

## Tahap 5 — Migrasi Inventaris + Peminjaman + Denda
- `inventaris`, `inventaris_pinjam`.

## Tahap 6 — Migrasi Absensi (Kegiatan + QR + Kehadiran)
- `kegiatan`, `kehadiran`.

## Tahap 7 — Polish: Backup nyata (ZIP semua tabel ke CSV), Hak Akses editable, WhatsApp Center.

---

## Detail Teknis Tahap 1

**Hash PIN** — pakai `pgcrypto` extension + `crypt(pin, gen_salt('bf'))`. Verifikasi via `crypt(pin, pin_hash) = pin_hash`.

**Session pengurus** — karena ini bukan auth Supabase user (warga tanpa login), pakai cookie httpOnly berisi `pengurus_id` + token random yang disimpan di tabel `pengurus_session(id, pengurus_id, token_hash, expires_at)`. Semua server function pengurus pakai middleware `requirePengurus` yang membaca cookie.

**RLS** — karena akses lewat server functions dengan service_role, tabel cukup `ENABLE RLS` + policy `USING (false)` di anon/authenticated (tidak ada akses langsung dari client). Hak akses sebenarnya divalidasi di server function (`has_role` check).

**Audit log** — di-insert otomatis di setiap server function lewat helper `await logAudit(ctx, aksi, modul, detail)`.

**Data localStorage lama** — TIDAK dimigrasi otomatis (data uji coba). Tahap 1 mulai dengan tabel kosong + empty state profesional.

---

## Yang TIDAK Diubah
- Tema, warna, font, glassmorphism, layout halaman, floating button (music & emergency), running text, dashboard cards.
- 14 modul utama di sidebar tetap di tempatnya.

Saya akan mulai dengan **Tahap 1** saja di giliran ini. Boleh saya lanjutkan?
