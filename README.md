<div align="center">
  <h1>🎓 EduProfile</h1>
  <p><strong>Unlocking Personalized Learning Paths through AI-Driven VAK Analysis.</strong></p>
  
  [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
  [![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://prisma.io)
</div>

<br />

**EduProfile** adalah platform asesmen edukasi berbasis *Machine Learning* yang dirancang untuk menganalisis dan menemukan **Gaya Belajar (Visual, Auditory, Kinesthetic)** serta **Kecepatan Belajar (Learning Pace)** setiap individu. Dengan menggabungkan analisis perilaku (*habit features*) dan performa kognitif, EduProfile menyajikan rekomendasi dan *roadmap* pembelajaran yang sangat personal untuk memaksimalkan potensi akademis.

---

## ✨ Fitur Unggulan

- 🧠 **AI-Powered VAK Prediction**: Menggunakan model *Machine Learning* terdedikasi untuk memprediksi probabilitas gaya belajar berdasarkan pola kebiasaan dan refleksi diri pengguna.
- ⚡ **Dynamic Pace Tracking**: Algoritma cerdas yang menghitung rasio Kecepatan (Speed) dan Akurasi (Accuracy) saat pengguna mengerjakan soal, mengkategorikan *learning pace* ke dalam 6 tingkatan spesifik (cth: `fast_accurate`, `moderate_inaccurate`).
- 🗺️ **Personalized Roadmaps**: Menghasilkan panduan belajar komprehensif yang dirancang secara dinamis sesuai dengan hasil prediksi gaya dan kecepatan belajar masing-masing pengguna.
- 🔒 **Secure Session Management**: Dilengkapi dengan arsitektur tes berbasis sesi (*Test Sessions*) yang ketat, anti-kecurangan, dan batas waktu otomatis (Timer).

## 🏗️ Arsitektur Sistem

Platform EduProfile terbagi menjadi dua *microservices* utama yang berjalan secara berdampingan:

1. **EduProfile Core (Backend)**
   Dibangun menggunakan **NestJS**, **Prisma ORM**, dan **PostgreSQL**. Bertugas sebagai *orchestrator* utama yang menangani autentikasi pengguna, manajemen *database* soal, pencatatan jawaban, pengkalkulasian skor performa, hingga integrasi dengan ML API.
   
2. **EduProfile ML Engine (AI API)**
   Dibangun menggunakan **Python** (FastAPI / Flask). Berfungsi sebagai otak prediktif yang menerima data `habit_features` serta `text_reflection` untuk dikonversi menjadi persentase probabilitas gaya belajar (V/A/K).

---

## 🧪 Alur Asesmen (The Test Flow)

EduProfile menggunakan metodologi 3 tahap untuk memastikan akurasi data yang dikumpulkan sebelum diserahkan kepada AI:

1. **Profile Test**: Pengguna menjawab 16 pertanyaan pilihan ganda terkait 8 kategori kebiasaan (contoh: *Device Usage, Emotion Engagement*). Tahap ini mengekstrak `habit_features`.
2. **Self-Perception**: Pengguna menuliskan esai singkat mengenai preferensi sadar mereka terhadap metode belajar.
3. **Performance Test**: Evaluasi inti berbasis teks (*reading comprehension*). Terdiri dari 3 dimensi (V, A, K) yang masing-masing harus diselesaikan dalam batas waktu 5 menit. Kecepatan dan ketepatan pengguna menjawab akan menentukan *Learning Pace*.

---

## 🚀 Memulai (Getting Started)

### Prasyarat (Prerequisites)
Pastikan sistem Anda sudah terinstal:
- Node.js (v18 atau lebih baru)
- Python (v3.9 atau lebih baru)
- PostgreSQL
- Git

### 1. Setup Database & Core Backend
```bash
# Masuk ke direktori backend
cd eduprofile-backend

# Install dependensi
npm install

# Konfigurasi Environment (Sesuaikan kredensial database Anda)
cp .env.example .env

# Sinkronisasi skema database dan jalankan Seeding Data Soal
npx prisma db push
npm run prisma:seed

# Jalankan server (Backend berjalan di port 3000)
npm run start:dev
```

### 2. Setup ML Engine
Pastikan Anda menjalankan *service* ML API Anda. Secara *default*, EduProfile Core akan mencari ML API di alamat `http://localhost:8000/predict`.

```bash
# (Contoh jika menggunakan FastAPI / Uvicorn)
cd eduprofile-ml
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 🛡️ Teknologi yang Digunakan

- **Framework:** NestJS, Express
- **Language:** TypeScript, Python
- **Database:** PostgreSQL, Prisma ORM
- **Security:** JWT (JSON Web Tokens), Bcrypt
- **Validation:** class-validator, class-transformer

---
<div align="center">
  <p>Dikembangkan dengan ❤️ untuk masa depan pendidikan yang lebih personal.</p>
</div>
