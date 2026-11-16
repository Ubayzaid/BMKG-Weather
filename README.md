# 🌤️ CuacaKita - Aplikasi Web Cuaca Indonesia (BMKG Data)

Aplikasi web prakiraan cuaca modern Indonesia berbasis **API Resmi BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)** dengan antarmuka visual dinamis dan animasi memukau terinspirasi oleh **Samsung Weather & Google Weather**.

---

## ✨ Fitur Utama

1. **Atmosfer Cuaca Dinamis (Procedural Canvas Engine)**:
   - Efek hujan deras dengan sudut kemiringan arah angin & pantulan percikan riak air (*water ripple splash*).
   - Efek badai petir (*thunderstorm*) dengan sambaran kilat realistis & *ambient screen illumination*.
   - Efek siang cerah dengan sinar matahari lembut (*God rays*), *lens flare*, dan partikel debu emas melayang.
   - Efek malam berbintang dengan bintang berkelap-kelip (*twinkling stars*), meteor jatuh (*shooting stars*), dan bulan bercahaya lembut.
   - Efek awan 3D volumetrik dan kabut (*fog/mist*).

2. **Hero Weather Display (Ala Samsung / Google Weather)**:
   - Angka suhu utama besar dan tegas dengan ikon cuaca animasi.
   - Ringkasan kondisi cuaca resmi BMKG (Cerah, Cerah Berawan, Hujan Ringan, dsb.).
   - Indeks suhu *Terasa Seperti* (*Feels Like / Heat Index*).
   - Rentang suhu tertinggi & terendah harian.
   - Banner rekomendasi aktivitas pintar (misal: saran membawa payung, peringatan cuaca panas, waktu jemur pakaian).

3. **Grafik Kurva Suhu Per Jam (Hourly Forecast)**:
   - Kurva garis spline halus (*SVG Bezier spline*) dengan efek gradien transparan.
   - Slider kartu per jam: waktu, ikon cuaca, suhu, kelembapan (%), dan kecepatan angin.

4. **Prakiraan 3 Hari (Multi-Day Forecast)**:
   - Ramalan cuaca hari ini, besok, dan lusa.
   - Bar rentang suhu gradien horizontal multi-warna (biru sejuk ke oranye hangat ala iOS & Samsung One UI).

5. **8 Bento Grid Cards Detail Interaktif**:
   - 💧 **Kelembapan Udara**: persentase, gauge bar, dan evaluasi kenyamanan.
   - 🧭 **Arah & Kecepatan Angin**: kompas interaktif dengan jarum yang berputar otomatis mengikuti derajat arah angin (`wd_deg`).
   - ☁️ **Tutupan Awan (TCC)**: persentase awan di langit.
   - ☀️ **Siklus Matahari**: kurva trajektori matahari dengan posisi matahari saat ini serta jam terbit dan terbenam.
   - 🌡️ **Indeks Kenyamanan Termal**: evaluasi panas tubuh berdasarkan suhu & kelembapan.
   - 👁️ **Jarak Pandang**: jarak pandang dalam kilometer.
   - 🗺️ **Data Wilayah**: rincian kecamatan, desa/kelurahan, koordinat GPS, dan zona waktu (WIB / WITA / WIT).
   - 🟢 **Integritas & Status API BMKG**: indikator status live BMKG & waktu pembaruan data terakhir.

6. **Audio Relaksasi Ambien (Procedural Web Audio API)**:
   - Suara alam lembut (hujan rintik-rintik, angin sejuk, desau malam) yang disintesis langsung menggunakan Web Audio API tanpa perlu mendownload file audio eksternal. Tombol mute/unmute dengan animasi gelombang suara.

7. **Pencarian Kota & Deteksi Lokasi (GPS)**:
   - 35+ kota besar, ibu kota provinsi, dan destinasi wisata di Indonesia (Jakarta, Surabaya, Bandung, Bali/Kuta/Ubud, Yogyakarta, Medan, Makassar, Semarang, Malang, Balikpapan, IKN Nusantara, dll.).
   - Deteksi otomatis kota terdekat berdasarkan koordinat GPS perangkat.
   - Bar "Kota Favorit" yang tersimpan di `localStorage`.

8. **Pengatur Satuan Suhu**:
   - Pilihan satuan Celsius (°C) atau Fahrenheit (°F).

---

## 🚀 Cara Menjalankan

### Prasyarat:
- Node.js versi 18 ke atas.

### Langkah-langkah:
1. Buka terminal di folder project:
   ```powershell
   cd "C:\Users\[namauser]\.gemini\antigravity\scratch\bmkg-weather-app"
   ```
2. Jalankan aplikasi:
   ```powershell
   npm.cmd start
   ```
3. Buka browser Anda di:
   ```
   http://localhost:3000
   ```
