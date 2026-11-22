# Dashboard Belanja dan Beban Daerah — Kabupaten Gunungkidul

Situs statis (HTML, CSS, JavaScript) tanpa proses build. Isinya Belanja (LRA) dan Beban (LO) TA 2023–2025 dari LKPD Kabupaten Gunungkidul, dengan tombol unduh laporan Excel untuk setiap tahun.

## Isi folder

```
index.html                  halaman utama
css/style.css               tampilan
js/app.js                   logika, grafik, tabel
js/data.js                  DATA (Rupiah) — satu-satunya tempat angka disimpan
js/chart.umd.js             Chart.js (sudah disertakan, tidak perlu internet)
downloads/                  3 file Excel, satu per tahun
tools/                      skrip Python untuk membuat ulang data.js dan file Excel
```

## Menjalankan di komputer sendiri

Buka `index.html` langsung di browser, atau jalankan server lokal:

```
python3 -m http.server 8000
```

lalu buka http://localhost:8000

## Mengonlinekan di Vercel

**Cara 1 — lewat GitHub (disarankan, otomatis ter-update):**
1. Buat repository baru di GitHub, lalu unggah seluruh isi folder ini (file `index.html` harus berada di root repository).
2. Di vercel.com pilih **Add New → Project**, lalu impor repository tersebut.
3. Pengaturan: **Framework Preset = Other**. Kosongkan Build Command dan Output Directory. Klik **Deploy**.
4. Setiap kali Anda mengubah file dan push ke GitHub, situs ikut ter-update.

**Cara 2 — lewat Vercel CLI:**
```
npm i -g vercel
cd folder-ini
vercel          # ikuti pertanyaannya, jawab default
vercel --prod   # untuk rilis produksi
```

## Mengubah atau menambah data

Angka disimpan di `js/data.js`, dan dihasilkan dari `tools/data.py` (format angka sama dengan PDF: titik ribuan, koma desimal).

1. Edit angka di `tools/data.py`.
2. Jalankan:
   ```
   pip install openpyxl
   python3 tools/data.py            # memeriksa subtotal terhadap total yang tertulis di PDF
   python3 tools/gen_data_js.py     # membuat ulang js/data.js
   python3 tools/build_xlsx.py      # membuat ulang 3 file Excel di downloads/
   ```
3. File Excel hasil `build_xlsx.py` berisi rumus tanpa nilai tersimpan; Excel menghitungnya otomatis saat file dibuka.

## Catatan data

- Sumber: LRA dan LO dalam LKPD Pemerintah Kabupaten Gunungkidul TA 2023, 2024, 2025 (kolom pembanding 2022 dari LKPD 2023).
- Seluruh subtotal dan total di dokumen sumber sudah dicocokkan dengan jumlah rinciannya.
- Pada dokumen sumber, LO 2023 dan LO 2024 berlabel "Audited", sedangkan kolom 2025 tidak berlabel "Audited".
- Beban Bantuan Keuangan pada LO 2025 jauh lebih kecil daripada Belanja Bantuan Keuangan pada LRA 2025. Angka mengikuti dokumen sumber.


## Pembaruan: narasi dan tombol "Semua"

- **Narasi dan Analisis** muncul di bawah halaman Ringkasan untuk tiap tahun. Teksnya dihitung otomatis dari `js/data.js` (fungsi `narasi()` di `js/app.js`), jadi ikut berubah kalau data diubah.
- **Tombol "Semua"** (di samping pilihan tahun) membuka halaman *Semua Tahun*: grafik 2023-2025, tabel lengkap belanja dan beban semua tahun, serta narasi tiga tahun (fungsi `vSemua()` dan `narasiAll()`).

## Pembaruan: rumus Excel

Setiap file Excel kini punya sheet **Rumus & Perhitungan** (16 indikator dengan rumus yang terlihat, plus 4 pemeriksaan otomatis), dan kolom baru di Rincian LRA (Sisa Anggaran, Porsi thd Total) dan Rincian LO (Porsi thd Total). Hanya angka biru di sheet Rincian yang berupa input dari dokumen sumber; semuanya selain itu rumus. Untuk membangun ulang: `python3 tools/build_xlsx.py`, lalu hitung ulang di Excel/LibreOffice.

Semua persentase dan hasil hitung di Excel memakai rumus. Rumusnya terlihat langsung: kolom **Rumus** di sheet Data Grafik (F-H), baris 3 di sheet Rincian LRA/LO (rumus tiap kolom), dan sheet Rumus & Perhitungan.

## Pembaruan: Lembar Kerja (rumus tampil di web, termasuk HP)

Menu **Lembar Kerja** menampilkan sheet Rincian LRA, Rincian LO, Data Grafik, dan Rumus & Perhitungan seperti di Excel. Ketuk sel untuk melihat nilai dan rumusnya di bilah rumus; sel yang dipakai rumus disorot kuning. Datanya dibaca dari file Excel di `downloads/`, jadi selalu sama dengan Excel.

Setelah mengubah data atau Excel, jalankan berurutan: `python3 tools/build_xlsx.py`, hitung ulang Excel (LibreOffice/Excel), lalu `python3 tools/gen_sheets_js.py` untuk memperbarui `js/sheets.js`.
