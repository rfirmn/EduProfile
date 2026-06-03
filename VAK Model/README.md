# Model VAK
Model VAK adalah suatu model yang bertujuan untuk menganalisis metode belajar pengguna. model ini menggunakan pendekatan Sequential Modular System dengan Custom Dense.  
## Input 
Input untuk model ada 2 
* inputan 8 indikator (70%)
(Edutech , DeviceUsage , Resources, Discussion , CourseParticipation, EmotionEngagement, physicalActivity , Extracuricullar)(int). nilai perlu dinormalisasi dalam skala 0-1. nilai didapatkan dari test profile
* inputan sentences (30%) 
nilai berupa string didapat dari jawaban pengguna dari soal Ceritakan bagaimana situasi atau momen belajar yang paling nyaman menurut dirimu. (Contoh: Apakah kamu harus melihat gambar, mendengarkan penjelasan langsung, atau mencoba mempraktikkannya sendiri?). nilai perlu dilakukan tokenisasi, dan embedding (kode untuk melakukan konversi ada di bagian Evaluasi)
## Output
output yang dihasilkan adalah analisis VAK serta confidence score 
## Deploying
Deploying menggunakan Fast API sebagai framework backend dalam proses deploying model ini. berikut langkah langkah yang harus di ikuti untuk menjalankan model (pastikan kamu mendownload python 3.12)
1. `py -3.12 -m venv venv`
2. `venv\Scripts\activate`
3. `pip install -r requirements.txt`
4. `python -m uvicorn app_api:app --host [IP_ADDRESS] --port 8000 --reload`

deploying masih bersifat lokal
