# SIPSD Sarpras

Dashboard eksploratif sarana dan prasarana persampahan Indonesia. Aplikasi menampilkan ringkasan nasional, peta tematik 38 provinsi, peringkat kesenjangan kapasitas angkut, serta drill-down hingga 514 kabupaten/kota.

## Fitur

- Ringkasan nasional: cakupan wilayah, timbulan sampah, pemenuhan angkut, dan gap kapasitas.
- Peta administratif Indonesia dengan batas 38 provinsi.
- Pewarnaan provinsi berdasarkan tingkat pemenuhan kapasitas angkut.
- Tooltip peta berisi pemenuhan dan gap kapasitas provinsi.
- Peringkat provinsi berdasarkan gap atau tingkat pemenuhan.
- Grafik perbandingan provinsi berdasarkan gap, timbulan, atau pemenuhan.
- Drill-down provinsi ke seluruh kabupaten/kota.
- Ilustrasi provinsi dengan warna prioritas dan garis batas administratif kabupaten/kota pada panel drill-down.
- Tooltip kabupaten/kota dapat dibuka melalui hover, fokus keyboard, atau klik/sentuh.
- Filter nasional berdasarkan Pusdal, kategori wilayah, dan prioritas P1–P4.
- Agregasi kartu ringkasan, peta, peringkat, dan grafik mengikuti filter aktif.
- Pencarian kabupaten/kota dan filter prioritas P1–P4.
- Tema gelap dan terang.
- Tampilan responsif untuk desktop dan perangkat bergerak.

## Teknologi

Aplikasi ini merupakan situs statis tanpa backend dan tanpa proses build:

- HTML
- CSS
- JavaScript murni
- GeoJSON
- JSON dan CSV

Karena tidak membutuhkan Node.js saat runtime, aplikasi dapat dilayani langsung oleh Nginx atau platform static hosting.

## Sumber data

Data operasional berasal dari spreadsheet:

- **Nama:** `2026-11-02_Database Teknis Operasional Persampahan`
- **Google Sheets:** <https://docs.google.com/spreadsheets/d/1qpmEl8vbFEHu7UZKqduavDY-n82vNFfa26Xfl1odjxE/>
- **Tanggal snapshot:** 2 November 2026
- **Sheet utama:** `Rekap_Nasional`, `Sarpras - Rekap by Provinsi`, `DB_Gap`, dan `DB_Eksisting`.

Data yang ditampilkan saat ini adalah **snapshot lokal**, bukan koneksi langsung ke Google Sheets. Perubahan pada spreadsheet tidak otomatis muncul di dashboard.

Referensi wilayah:

- `provinces.csv` dan `regencies.csv`: kode wilayah Kemendagri 2025 dari [dataset-wilayah-indonesia](https://github.com/prodhokter/dataset-wilayah-indonesia).
- `indonesia-38-provinces.geojson`: batas 38 provinsi dari [indonesia-geojson-topojson-maps-with-38-provinces](https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces), berlisensi CC BY 4.0.
- `boundaries/*.geojson`: batas 514 kabupaten/kota dari [Indonesia-GeoJSON](https://github.com/AlfianAliM/Indonesia-GeoJSON), berlisensi MIT; geometri disederhanakan untuk kebutuhan web.

## Struktur proyek

```text
.
├── index.html                         # Struktur halaman dashboard
├── app.js                             # Data provinsi dan seluruh interaksi UI
├── styles.css                         # Gaya utama dashboard
├── map.css                            # Gaya peta dan tooltip
├── detail.css                         # Gaya drawer drill-down
├── indonesia-38-provinces.geojson     # Geometri 38 provinsi
├── boundaries/                        # Geometri kabupaten/kota per provinsi
├── region-details.json                # Dataset final 514 kabupaten/kota
├── region-details.raw.json            # Snapshot detail sebelum enrichment provinsi
├── provinces.csv                      # Referensi provinsi Kemendagri
├── regencies.csv                      # Referensi kabupaten/kota Kemendagri
└── scripts/
    ├── build-region-data.mjs          # Pencocokan wilayah dan pembentukan dataset final
    └── build-boundaries.mjs           # Penyederhanaan geometri kabupaten/kota
```

Kolom ringkas dalam `region-details.json`:

| Kolom | Keterangan |
| --- | --- |
| `s` | Wilayah Pusdal LH |
| `p` | Provinsi |
| `n` | Nama kabupaten/kota |
| `k` | Kategori wilayah |
| `t` | Timbulan sampah, ton/hari |
| `e` | Kapasitas angkut eksisting, ton/hari |
| `b` | Kebutuhan kapasitas angkut, ton/hari |
| `g` | Gap kapasitas angkut, ton/hari |
| `c` | Persentase pemenuhan angkut |
| `d` | Ekuivalen tambahan dump truck |
| `q` | Kategori prioritas pengangkutan |

## Menjalankan secara lokal

Jangan membuka `index.html` langsung menggunakan skema `file://`, karena browser dapat memblokir pemuatan berkas JSON dan GeoJSON. Jalankan HTTP server lokal dari root proyek.

Dengan Python:

```bash
python3 -m http.server 4173
```

Kemudian buka:

```text
http://127.0.0.1:4173
```

Alternatif menggunakan Nginx, Caddy, atau server statis lain juga dapat digunakan.

## Memperbarui data kabupaten/kota

1. Ambil data terbaru dari sheet sumber dan perbarui `region-details.raw.json`.
2. Jika referensi administratif berubah, perbarui `provinces.csv` dan `regencies.csv`.
3. Bangun ulang dataset final:

   ```bash
   node scripts/build-region-data.mjs
   ```

4. Script harus berakhir dengan pesan:

   ```text
   Berhasil mencocokkan 514 kabupaten/kota.
   ```

5. Jalankan dashboard melalui HTTP server dan periksa:

   - peta menampilkan 38 provinsi;
   - setiap provinsi dapat diklik;
   - jumlah kabupaten/kota sesuai;
   - pencarian dan filter P1–P4 bekerja;
   - tidak ada error pada console browser.

> `build-region-data.mjs` hanya melakukan pencocokan data detail dengan referensi wilayah. Script ini belum mengambil data secara otomatis dari Google Sheets.

## Deployment produksi

Repository GitLab:

```text
git@gitlab.com:genetik/sipsd-sarpras.git
```

Contoh deployment:

```bash
cd /root
git clone git@gitlab.com:genetik/sipsd-sarpras.git sarpras
cd /root/sarpras
```

Untuk memperbarui deployment:

```bash
cd /root/sarpras
git pull --ff-only origin main
nginx -t
systemctl reload nginx
```

## Deployment otomatis GitLab CI

Pipeline pada `.gitlab-ci.yml` menjalankan deployment otomatis setiap ada push ke branch default GitLab. Job akan:

1. membangun ulang dan memvalidasi konsistensi dataset;
2. memastikan hasil generator data sudah tersimpan di repository;
3. membuat container deployment sementara;
4. memverifikasi host SSH;
5. terhubung ke VPS dengan SSH key atau password;
6. masuk ke `/opt/sarpras`;
7. menjalankan `git pull --ff-only origin main`;
8. menjalankan smoke test pada halaman utama dan `region-details.json`.

Tambahkan variabel berikut melalui **GitLab → Settings → CI/CD → Variables**:

| Variabel | Wajib | Isi |
| --- | --- | --- |
| `VPS_HOST` | Ya | IP atau hostname VPS |
| `VPS_USERNAME` | Ya | Username SSH pada VPS |
| `VPS_SSH_PRIVATE_KEY` | Direkomendasikan | Private key SSH khusus deployment |
| `VPS_PASSWORD` | Fallback | Password SSH jika private key tidak digunakan |
| `VPS_PORT` | Tidak | Port SSH; default `22` |
| `VPS_KNOWN_HOSTS` | Direkomendasikan | Public host key VPS dalam format `known_hosts` |

Isi salah satu dari `VPS_SSH_PRIVATE_KEY` atau `VPS_PASSWORD`. SSH key direkomendasikan. Atur credential sebagai **Masked** dan **Protected**. Atur variabel lain sebagai **Protected** bila branch `main` juga dilindungi.

Untuk memperoleh nilai `VPS_KNOWN_HOSTS`, jalankan dari mesin yang dipercaya:

```bash
ssh-keyscan -H -p 22 IP_VPS
```

Salin seluruh hasilnya sebagai nilai variabel. Jika `VPS_KNOWN_HOSTS` tidak diisi, pipeline akan mengambil host key menggunakan `ssh-keyscan` saat job berjalan. Cara tersebut lebih mudah, tetapi tidak memberikan perlindungan sekuat host key yang diverifikasi sebelumnya.

### Persiapan VPS

Repository harus sudah tersedia di `/opt/sarpras` dan dapat ditarik oleh user deployment:

```bash
cd /opt
git clone git@gitlab.com:genetik/sipsd-sarpras.git sarpras
chown -R USER_DEPLOY:USER_DEPLOY /opt/sarpras
```

Pastikan user deployment dapat menjalankan perintah berikut tanpa interaksi:

```bash
cd /opt/sarpras
git pull --ff-only origin main
```

VPS juga harus memiliki akses ke repository GitLab. Untuk repository privat, konfigurasi salah satu dari berikut pada VPS:

- deploy key SSH GitLab; atau
- credential HTTPS dengan hak baca repository.

Pipeline tidak menjalankan `git reset`, tidak menggunakan force pull, dan akan gagal jika `/opt/sarpras` memiliki perubahan lokal yang bertentangan. Hal ini mencegah deployment menimpa perubahan server secara diam-diam.

### Validasi data di CI

`scripts/validate-data.mjs` menghentikan pipeline jika ditemukan masalah berikut:

- jumlah daerah bukan 514;
- jumlah provinsi bukan 38;
- Pusdal, provinsi, kategori, atau prioritas kosong/tidak valid;
- nama kabupaten/kota duplikat;
- angka negatif atau persentase di luar 0–100;
- agregat nasional menyimpang dari snapshot acuan;
- GeoJSON bukan 38 fitur provinsi;
- file referensi wilayah memiliki jumlah baris yang tidak sesuai.

Validasi dapat dijalankan lokal:

```bash
node scripts/build-region-data.mjs
node scripts/validate-data.mjs
```

## Konfigurasi Nginx

Domain produksi:

```text
https://sarpras.sipsd.id
```

Contoh virtual host, misalnya disimpan di `/etc/nginx/conf.d/sarpras.sipsd.id.conf`:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name sarpras.sipsd.id;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name sarpras.sipsd.id;

    root /root/sarpras;
    index index.html;

    ssl_certificate     /etc/nginx/conf.d/sipsd.pem;
    ssl_certificate_key /etc/nginx/conf.d/sipsd.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    server_tokens off;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(json|geojson|csv)$ {
        try_files $uri =404;
        expires 5m;
        add_header Cache-Control "public, must-revalidate";
        add_header X-Content-Type-Options "nosniff" always;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$ {
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\. {
        deny all;
    }

    access_log /var/log/nginx/sarpras.sipsd.id.access.log;
    error_log  /var/log/nginx/sarpras.sipsd.id.error.log;
}
```

Validasi konfigurasi:

```bash
nginx -t
systemctl reload nginx
```

### Permission direktori

Pada sebagian distribusi Linux, worker Nginx tidak dapat melakukan traversal ke `/root`, walaupun berkas aplikasi dapat dibaca. Jika muncul respons `403 Forbidden`, lokasi yang direkomendasikan adalah:

```text
/var/www/sarpras
```

Contoh pemindahan deployment:

```bash
mkdir -p /var/www/sarpras
cp -a /root/sarpras/. /var/www/sarpras/
chown -R root:root /var/www/sarpras
find /var/www/sarpras -type d -exec chmod 755 {} \;
find /var/www/sarpras -type f -exec chmod 644 {} \;
```

Setelah itu ubah directive Nginx menjadi:

```nginx
root /var/www/sarpras;
```

## Checklist setelah deployment

```bash
curl -I http://sarpras.sipsd.id
curl -I https://sarpras.sipsd.id
curl -I https://sarpras.sipsd.id/region-details.json
curl -I https://sarpras.sipsd.id/indonesia-38-provinces.geojson
```

Pastikan:

- HTTP dialihkan ke HTTPS;
- sertifikat SSL valid untuk `sarpras.sipsd.id`;
- halaman utama memberikan status `200`;
- berkas JSON dan GeoJSON dapat dimuat;
- peta dan drawer drill-down berfungsi;
- tidak ada error JavaScript di browser.

## Catatan keamanan dan operasional

- Jangan menyimpan kredensial Google, private key SSH, atau private key SSL di repository.
- Berkas `sipsd.key` hanya boleh dibaca oleh root atau proses Nginx yang membutuhkannya.
- Dashboard tidak memerlukan autentikasi Google pada runtime karena menggunakan snapshot lokal.
- Jika data bersifat terbatas, tambahkan autentikasi pada reverse proxy atau gunakan jaringan internal.
- Periksa lisensi dan kebijakan publikasi sebelum membuka data operasional ke internet.
- Hindari cache panjang untuk JSON/GeoJSON agar pembaruan data tidak tertahan di browser.

## Batasan saat ini

- Belum ada sinkronisasi otomatis dengan Google Sheets.
- Belum ada backend, autentikasi pengguna, atau audit log.
- Data hanya berubah ketika snapshot lokal diperbarui dan deployment dilakukan ulang.
- Peta provinsi digunakan untuk navigasi; geometri kabupaten/kota belum ditampilkan.

## Pengembangan lanjutan

Pengembangan yang disarankan:

- sinkronisasi Google Sheets melalui service account dan job terjadwal;
- validasi skema data sebelum deployment;
- CI/CD GitLab untuk deployment otomatis;
- histori snapshot dan perbandingan antarperiode;
- geometri serta visualisasi tingkat kabupaten/kota;
- pengujian otomatis untuk agregasi data dan interaksi dashboard.
