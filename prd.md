Berikut adalah rancangan **Product Requirements Document (PRD)** lengkap untuk aplikasi manajemen projek personal Anda. Dokumen ini akan menjadi panduan (blueprint) yang jelas saat Anda mulai *coding*.

---

# Product Requirements Document (PRD): Personal Project Manager

## 1. Ringkasan Eksekutif
Aplikasi web berbasis *single-user* (hanya untuk Anda) yang berfungsi sebagai pusat kendali untuk mengelola berbagai projek personal. Aplikasi ini dirancang agar ringan, cepat, dan minimalis, dengan fokus utama pada manajemen tugas (*todo list*) yang mendukung hierarki (*nested/beranak*) dan penentuan tenggat waktu (*deadline*). 

## 2. Tujuan & Sasaran
* **Sentralisasi Informasi:** Menyimpan semua informasi projek (penjelasan, info server, kredensial dasar) di satu tempat.
* **Manajemen Tugas Detail:** Memecah tugas besar menjadi sub-tugas yang lebih kecil (*nested todos*) tanpa batas kedalaman agar lebih mudah dieksekusi.
* **Tracking Progres:** Memantau sejauh mana projek berjalan melalui persentase *progress* dan tenggat waktu (*deadline*).

## 3. Tech Stack & Infrastruktur
* **Frontend & Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS
* **UI Components:** Shadcn UI (Card, Table, Button, Input, Checkbox, Date Picker, Progress)
* **Backend & Database:** Supabase (PostgreSQL)
* **Autentikasi:** Supabase Auth (Magic Link atau Email/Password, dibatasi hanya untuk 1 email pengguna/RLS dikunci).

---

## 4. Spesifikasi Fitur Utama

### A. Autentikasi Tunggal (Single-User Auth)
* Sistem login sederhana untuk mengamankan data.
* Pendaftaran pengguna baru dinonaktifkan setelah akun Anda dibuat.
* *Row Level Security* (RLS) di Supabase diaktifkan agar data hanya bisa dibaca dan diubah oleh `user_id` Anda.

### B. Manajemen Projek (Project Management)
* Membuat projek baru dengan *field*: Nama Projek, Penjelasan, Info Server dll.
* Melihat daftar semua projek di halaman utama.
* Memperbarui informasi projek, termasuk *slider* atau *input* persentase `Progress` (0-100%).
* Menghapus projek (akan otomatis menghapus semua *todo list* di dalamnya / *Cascade Delete*).

### C. Manajemen Tugas Beranak (Nested Todo List)
* Menambahkan tugas utama ke dalam sebuah projek.
* Menambahkan sub-tugas (*child*) ke dalam tugas yang sudah ada.
* Setiap tugas/sub-tugas memiliki *field*: Nama Tugas, Kotak Centang (Status Selesai/Belum), dan Deadline (Opsional).
* Menandai tugas selesai (Kotak centang / *Checkbox*). Jika tugas induk dicentang selesai, opsional untuk mencentang otomatis semua anak-anaknya.
* Indikator visual untuk tugas yang melewati *deadline* (misal: teks berwarna merah).

---

## 5. Struktur Halaman (User Interface)

Aplikasi hanya terdiri dari dua halaman utama untuk menjaga kesederhanaan.

### Halaman 1: Dashboard (`/`)
Halaman pertama yang dilihat setelah login.
* **Header:** Judul "Dashboard" dan tombol "+ Projek Baru".
* **Daftar Projek:** Ditampilkan dalam bentuk *Grid Card* atau *Table*.
* **Informasi per Card:** Nama Projek, cuplikan Penjelasan, dan Bar *Progress* (0-100%).
* **Interaksi:** Mengklik kartu/baris projek akan mengarahkan pengguna ke Halaman 2.

### Halaman 2: Kelola Tugas & Detail Projek (`/projek/[id]`)
Halaman kerja utama untuk satu projek spesifik. Dibagi menjadi dua bagian (Kiri dan Kanan, atau Atas dan Bawah tergantung ukuran layar).
* **Bagian Informasi Projek:**
    * Nama Projek (Bisa diedit).
    * Penjelasan detail (Textarea).
    * Info Server dll (Textarea).
    * Progress saat ini (Bisa diedit manual atau otomatis dihitung dari jumlah tugas selesai).
* **Bagian Todo List:**
    * Tombol "+ Tambah Tugas Utama".
    * Daftar tugas yang dirender secara rekursif (menjorok ke dalam untuk sub-tugas).
    * Setiap baris tugas menampilkan: Kotak Centang, Nama Tugas, Tanggal Deadline, tombol "Hapus", dan tombol "+ Sub-tugas".

---

## 6. Model Data (Skema Database)

Aplikasi menggunakan dua tabel relasional utama di Supabase PostgreSQL.

**Tabel `projects`**
* `id` (UUID, Primary Key)
* `user_id` (UUID, Foreign Key ke tabel Auth)
* `nama_projek` (String)
* `penjelasan` (Text)
* `progress` (Integer, Default: 0)
* `info_server` (Text)
* `created_at` (Timestamp)

**Tabel `todos`**
* `id` (UUID, Primary Key)
* `project_id` (UUID, Foreign Key ke `projects`, Cascade Delete)
* `parent_id` (UUID, Foreign Key ke `todos.id`, Nullable, Cascade Delete)
* `nama_tugas` (String)
* `deadline` (Timestamp, Nullable)
* `is_done` (Boolean, Default: False)
* `created_at` (Timestamp)

---

## 7. Kriteria Penerimaan (Acceptance Criteria)

Aplikasi dianggap "Selesai" untuk MVP (Minimum Viable Product) jika:
1. Anda bisa login dengan aman dan orang lain tidak bisa mengakses data Anda.
2. Anda bisa membuat, melihat, dan mengedit informasi projek di Dashboard.
3. Anda bisa membuat tugas, menambahkan sub-tugas di bawahnya (beranak), dan menambahkan sub-tugas lagi di bawah anak tersebut (multi-level nesting).
4. Kotak centang berfungsi secara *real-time* memperbarui status `is_done` di *database*.
5. *Deadline* dapat diatur dan tampil dengan format yang mudah dibaca.
