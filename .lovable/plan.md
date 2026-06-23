## Ringkasan

Permintaan ini sangat besar — mencakup 15+ modul fungsional, autentikasi PIN berbasis role, database (warga, keuangan multi-kas, inventaris, agenda, dll), QR generator, broadcast WhatsApp, backup Google Drive, audit log, dan integrasi backup. Tidak mungkin (dan tidak bijak) dikerjakan dalam satu giliran — hasilnya akan dangkal, banyak bug, dan sulit dirawat.

Saya usulkan pendekatan **bertahap (fase)**. Setiap fase menghasilkan modul yang benar-benar berfungsi sebelum lanjut.

---

## Fase 1 — Fondasi UI & Dashboard (giliran ini)

Yang akan saya kerjakan **sekarang**:

1. **Identitas & branding**
   - Logo RT06 sebagai favicon, splash, navbar, login, QR Center
   - Tema RT06 Smart Blue dipertajam (Primary `#2563EB`, Secondary `#1E40AF`, BG `#F8FAFC`)
   - Light & Dark mode tetap konsisten

2. **Dashboard disempurnakan**
   - Header sapaan "👋 Selamat Datang" + jam/hari/tanggal WIB realtime
   - Running text pengumuman
   - Quick Access (6 kartu)
   - Statistik Pengunjung (3)
   - Statistik Dashboard (6)
   - **Widget baru: Agenda Hari Ini** (state kosong: "Tidak ada agenda hari ini")
   - **Widget baru: Status Sistem** (🟢 Online + Backup Terakhir)
   - Tombol Refresh transparan

3. **Floating Emergency Button** (sudah ada — dirapikan)
4. **Floating Music Player** (sudah ada — dipastikan persisten antar halaman)
5. **Mobile-first polish** untuk layar Android 360–414px

## Fase 2 — Autentikasi & Role (giliran berikutnya)
- Aktifkan **Lovable Cloud**
- Halaman Login PIN 6 digit (PIN awal `060707`)
- 11 role + tabel `user_roles` + `has_role()` security definer
- Session timeout, lock 5x gagal, audit log dasar

## Fase 3 — Data Warga & KK
Tabel KK, anggota, status warga/hunian, mutasi, filter

## Fase 4 — Keuangan multi-kas
5 jenis kas (RT, Sosial, HUT RI, Perkakas, Motor Tossa), transaksi, status pembayaran warga, halaman transparansi publik

## Fase 5 — Administrasi
Pengumuman, Agenda, Surat Masuk/Keluar, Arsip, Notulen

## Fase 6 — Inventaris + Peminjaman + Poskamling + Absensi

## Fase 7 — QR Center, UMKM, Kritik & Saran, Emergency Center CRUD

## Fase 8 — Media Center, WhatsApp Center, Pengaturan, Backup, Audit Log

---

## Pertanyaan sebelum mulai Fase 1

1. **Setuju dengan pendekatan bertahap di atas?** Saya tidak akan menumpuk semua di satu giliran karena akan menghasilkan kode rapuh.
2. **Untuk Fase 1, apakah cukup fokus ke Dashboard + branding + 2 widget baru (Agenda Hari Ini & Status Sistem)?** Modul lain tetap sebagai placeholder rapi sampai gilirannya.
3. **Backup Google Drive & WhatsApp Broadcast** memerlukan integrasi eksternal (OAuth Google + WhatsApp Business API atau wa.me). Konfirmasi apakah cukup `wa.me/<nomor>?text=` (gratis, manual) atau perlu API resmi (berbayar)?

Jika Anda jawab "lanjut Fase 1", saya langsung kerjakan.
