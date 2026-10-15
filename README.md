# Notulen MA Ash-Shiddiiqi

Aplikasi web notulen rapat dan pertemuan madrasah. Tanpa server dan tanpa instalasi: cukup HTML, CSS, dan JavaScript. Bisa langsung dipublikasikan lewat **GitHub Pages**.

## Fitur

- Notulen lengkap: jenis pertemuan, judul, nomor otomatis, waktu, tempat, pimpinan, notulis
- Daftar hadir (Hadir/Izin/Sakit/Alpa) dengan **daftar peserta tetap** dan tempel banyak nama sekaligus
- Agenda, pembahasan, keputusan, tindak lanjut (penanggung jawab, tenggat, status), rapat berikutnya
- Dokumen resmi berkop madrasah (logo, alamat) dengan kolom tanda tangan Pimpinan, Notulis, Kepala Madrasah
- **Cetak / simpan PDF** ukuran A4 (lewat fitur cetak browser, hasilnya rapi dan bisa dipilih teksnya)
- **Kirim ke WhatsApp**: pesan terformat (judul tebal, daftar, emoji) yang bisa diedit sebelum dikirim, ke nomor tertentu atau pilih kontak/grup; juga tombol Bagikan dan Salin
- Pencarian, filter jenis/status, pantau tindak lanjut yang belum selesai
- Duplikat notulen untuk rapat rutin
- Cadangan data: ekspor/impor `.json`
- Bisa dipasang di layar utama HP (PWA) dan tetap terbuka saat offline

## Cara memublikasikan di GitHub

1. Buat repositori baru, mis. `notulen-ash-shiddiiqi`.
2. Unggah semua file di folder ini ke cabang `main`.
3. Buka **Settings → Pages**, pada *Build and deployment* pilih **Deploy from a branch**, cabang `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit. Aplikasi bisa dibuka di `https://<username>.github.io/notulen-ash-shiddiiqi/`.

## Pertama kali dipakai

1. Buka menu **Pengaturan**: isi nama madrasah, alamat, kota, nama Kepala Madrasah, logo, dan daftar peserta tetap.
2. Tekan **＋ Notulen Baru**, isi, lalu **Simpan**.
3. Di halaman notulen: **Cetak / PDF** atau **Kirim WhatsApp**.

## Catatan penting

- **Data tersimpan di browser perangkat** (localStorage), belum di server. Ekspor cadangan secara berkala. Data di HP dan laptop tidak otomatis sama; pindahkan lewat Ekspor/Impor.
- **WhatsApp**: web statis hanya bisa membuka WhatsApp dengan pesan yang sudah terisi, lalu Anda menekan kirim. Pengiriman otomatis tanpa klik (mis. ke grup) membutuhkan layanan server/gateway WhatsApp, dan itu bisa menjadi tahap berikutnya.

## Pengembangan berikutnya (usulan)

- Penyimpanan online (Supabase/Firebase) dan login agar notulen dipakai bersama oleh beberapa guru/operator
- Tanda tangan digital dan lampiran foto dokumentasi
- Pengiriman WhatsApp otomatis lewat gateway
- Rekap bulanan/semester dan ekspor Excel

## Struktur

```
index.html   kerangka halaman
style.css    tampilan layar dan cetak A4
app.js       seluruh logika aplikasi
manifest.json, sw.js, icon.svg   PWA (pasang di layar utama, offline)
```
