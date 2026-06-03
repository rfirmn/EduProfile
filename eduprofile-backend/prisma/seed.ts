import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Validasi
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL tidak terbaca dari file .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database (v2 — new test schema)...\n');

  // =====================================================================
  // 1. PROFILE TEST QUESTIONS (8 kategori × 2 soal = 16 soal)
  // =====================================================================
  console.log('📋 Seeding Profile Test Questions...');

  const profileTestData = [
    {
      category: 'Edutech',
      questions: [
        {
          text: 'Seberapa sering kamu menggunakan aplikasi atau platform digital untuk belajar?',
          options: [
            { label: 'A', text: 'Jarang / hampir tidak pernah', score: 0 },
            { label: 'B', text: 'Kadang-kadang (1-2 kali seminggu)', score: 1 },
          ],
        },
        {
          text: 'Apakah kamu merasa nyaman menggunakan teknologi baru dalam proses belajar?',
          options: [
            { label: 'A', text: 'Tidak, saya lebih suka cara konvensional', score: 0 },
            { label: 'B', text: 'Ya, saya senang mencoba teknologi baru', score: 1 },
          ],
        },
      ],
    },
    {
      category: 'DeviceUsage',
      questions: [
        {
          text: 'Perangkat apa yang paling sering kamu gunakan untuk belajar?',
          options: [
            { label: 'A', text: 'Buku cetak / catatan fisik', score: 0 },
            { label: 'B', text: 'Laptop / tablet / smartphone', score: 1 },
          ],
        },
        {
          text: 'Berapa jam per hari kamu menggunakan perangkat digital untuk kegiatan belajar?',
          options: [
            { label: 'A', text: 'Kurang dari 1 jam', score: 0 },
            { label: 'B', text: 'Lebih dari 1 jam', score: 1 },
          ],
        },
      ],
    },
    {
      category: 'Resources',
      questions: [
        {
          text: 'Sumber belajar apa yang paling sering kamu gunakan?',
          options: [
            { label: 'A', text: 'Buku teks dan catatan guru', score: 0 },
            { label: 'B', text: 'Video tutorial / artikel online / e-book', score: 1 },
          ],
        },
        {
          text: 'Apakah kamu sering mencari referensi tambahan di luar yang diberikan guru/dosen?',
          options: [
            { label: 'A', text: 'Tidak, cukup materi yang diberikan', score: 0 },
            { label: 'B', text: 'Ya, saya sering eksplorasi sendiri', score: 1 },
          ],
        },
      ],
    },
    {
      category: 'Discussion',
      questions: [
        {
          text: 'Bagaimana kamu lebih suka berdiskusi tentang materi pelajaran?',
          options: [
            { label: 'A', text: 'Diskusi langsung tatap muka', score: 0 },
            { label: 'B', text: 'Diskusi via chat / forum online', score: 1 },
          ],
        },
        {
          text: 'Seberapa sering kamu berdiskusi dengan teman tentang materi belajar?',
          options: [
            { label: 'A', text: 'Jarang, saya lebih suka belajar sendiri', score: 0 },
            { label: 'B', text: 'Sering, diskusi membantu saya memahami', score: 1 },
          ],
        },
      ],
    },
    {
      category: 'CourseParticipation',
      questions: [
        {
          text: 'Apakah kamu pernah mengikuti kursus online atau webinar?',
          options: [
            { label: 'A', text: 'Belum pernah', score: 0 },
            { label: 'B', text: 'Pernah, minimal 1 kali', score: 1 },
          ],
        },
        {
          text: 'Bagaimana tingkat keaktifanmu dalam kegiatan belajar di kelas/perkuliahan?',
          options: [
            { label: 'A', text: 'Pasif, lebih banyak mendengarkan', score: 0 },
            { label: 'B', text: 'Aktif bertanya dan berpendapat', score: 1 },
          ],
        },
      ],
    },
    {
      category: 'EmotionEngagement',
      questions: [
        {
          text: 'Bagaimana perasaanmu saat menghadapi materi pelajaran yang sulit?',
          options: [
            { label: 'A', text: 'Cepat frustrasi dan ingin menyerah', score: 0 },
            { label: 'B', text: 'Tertantang dan termotivasi untuk mencoba', score: 1 },
          ],
        },
        {
          text: 'Apakah kamu merasa enjoy saat proses belajar berlangsung?',
          options: [
            { label: 'A', text: 'Tidak selalu, tergantung materinya', score: 0 },
            { label: 'B', text: 'Ya, saya menikmati proses belajar', score: 1 },
          ],
        },
      ],
    },
    {
      category: 'PhysicalActivity',
      questions: [
        {
          text: 'Apakah kamu menyukai aktivitas fisik atau belajar sambil bergerak?',
          options: [
            { label: 'A', text: 'Tidak, saya lebih suka duduk tenang', score: 0 },
            { label: 'B', text: 'Ya, saya lebih fokus saat bergerak', score: 1 },
          ],
        },
        {
          text: 'Apakah kamu sering belajar sambil melakukan praktik langsung (hands-on)?',
          options: [
            { label: 'A', text: 'Jarang, saya lebih suka membaca/mendengar', score: 0 },
            { label: 'B', text: 'Sering, saya lebih paham dengan praktik', score: 1 },
          ],
        },
      ],
    },
    {
      category: 'Extracurricular',
      questions: [
        {
          text: 'Apakah kamu aktif dalam kegiatan ekstrakurikuler atau organisasi?',
          options: [
            { label: 'A', text: 'Tidak, saya fokus akademis saja', score: 0 },
            { label: 'B', text: 'Ya, saya aktif di beberapa kegiatan', score: 1 },
          ],
        },
        {
          text: 'Apakah kegiatan di luar kelas membantu meningkatkan kemampuan belajarmu?',
          options: [
            { label: 'A', text: 'Tidak terlalu berpengaruh', score: 0 },
            { label: 'B', text: 'Ya, sangat membantu', score: 1 },
          ],
        },
      ],
    },
  ];

  let orderIndex = 1;
  for (const categoryData of profileTestData) {
    for (const q of categoryData.questions) {
      await prisma.profileTestQuestion.create({
        data: {
          category: categoryData.category,
          questionText: q.text,
          orderIndex: orderIndex++,
          isActive: true,
          options: {
            create: q.options.map((o, idx) => ({
              optionLabel: o.label,
              optionText: o.text,
              scoreValue: o.score,
              orderIndex: idx + 1,
            })),
          },
        },
      });
    }
  }
  console.log(`✅ ${orderIndex - 1} Profile Test questions seeded (8 categories × 2 soal)\n`);

  // =====================================================================
  // 2. SELF-PERCEPTION QUESTION (1 soal esai)
  // =====================================================================
  console.log('📝 Seeding Self-Perception Question...');

  await prisma.selfPerceptionQuestion.create({
    data: {
      questionText:
        'Ceritakan bagaimana situasi atau momen belajar yang paling nyaman menurut dirimu. ' +
        '(Contoh: Apakah kamu harus melihat gambar, mendengarkan penjelasan langsung, ' +
        'atau mencoba mempraktikkannya sendiri?)',
      orderIndex: 1,
      isActive: true,
    },
  });
  console.log('✅ 1 Self-Perception question seeded\n');

  // =====================================================================
  // 3. PERFORMANCE PACKAGES (V, A, K — text-based, 3 soal per dimensi)
  // =====================================================================
  console.log('📚 Seeding Performance Packages...');

  // --- Visual Package ---
  await prisma.performancePackage.create({
    data: {
      vakDimension: 'V',
      title: 'Pemahaman Visual - Deskripsi Diagram',
      slug: 'visual-diagram-1',
      description: 'Tes pemahaman berbasis teks yang menguji kemampuan membayangkan dan memvisualisasi informasi',
      genre: 'General',
      isActive: true,
      materials: {
        create: [
          {
            title: 'Teks Deskripsi Diagram Alur',
            content:
              'Bayangkan sebuah diagram alur proses fotosintesis. Diagram dimulai dari sinar matahari ' +
              'yang masuk ke daun melalui stomata. Air (H₂O) diserap oleh akar dan dikirim ke daun ' +
              'melalui xilem. Karbon dioksida (CO₂) masuk melalui stomata. Di kloroplas, reaksi terang ' +
              'menghasilkan ATP dan NADPH, lalu siklus Calvin mengubah CO₂ menjadi glukosa (C₆H₁₂O₆). ' +
              'Oksigen (O₂) dikeluarkan sebagai produk sampingan.',
            orderIndex: 1,
          },
        ],
      },
      questions: {
        create: [
          {
            questionText: 'Berdasarkan teks di atas, komponen apa yang masuk melalui stomata?',
            orderIndex: 1,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Air dan glukosa', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Sinar matahari dan oksigen', scoreValue: 0.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Karbon dioksida dan sinar matahari', scoreValue: 1.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'ATP dan NADPH', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
          {
            questionText: 'Apa produk akhir dari siklus Calvin yang disebutkan dalam teks?',
            orderIndex: 2,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Oksigen', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Glukosa', scoreValue: 1.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Air', scoreValue: 0.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'Klorofil', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
          {
            questionText: 'Melalui bagian tumbuhan mana air dikirim dari akar ke daun?',
            orderIndex: 3,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Floem', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Stomata', scoreValue: 0.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Xilem', scoreValue: 1.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'Kloroplas', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
        ],
      },
    },
  });

  // --- Auditory Package ---
  await prisma.performancePackage.create({
    data: {
      vakDimension: 'A',
      title: 'Pemahaman Auditori - Transkrip Diskusi',
      slug: 'auditory-diskusi-1',
      description: 'Tes pemahaman berbasis teks berupa transkrip percakapan/diskusi',
      genre: 'General',
      isActive: true,
      materials: {
        create: [
          {
            title: 'Transkrip Diskusi tentang Perubahan Iklim',
            content:
              'Pak Guru: "Anak-anak, hari ini kita akan membahas perubahan iklim. Siapa yang tahu apa itu efek rumah kaca?"\n' +
              'Budi: "Efek rumah kaca adalah ketika gas-gas tertentu di atmosfer menangkap panas matahari, sehingga bumi menjadi lebih hangat."\n' +
              'Pak Guru: "Benar sekali! Gas-gas seperti CO₂ dan metana berperan besar. Lalu, apa dampaknya bagi kehidupan kita?"\n' +
              'Sari: "Saya dengar kalau es di kutub mencair, permukaan air laut naik, dan banyak daerah pesisir yang bisa tenggelam."\n' +
              'Pak Guru: "Tepat! Dan jangan lupa, cuaca ekstrem juga semakin sering terjadi. Apa yang bisa kita lakukan?"\n' +
              'Andi: "Kita bisa mengurangi penggunaan bahan bakar fosil dan menanam lebih banyak pohon untuk menyerap CO₂."',
            orderIndex: 1,
          },
        ],
      },
      questions: {
        create: [
          {
            questionText: 'Menurut Budi dalam diskusi, apa yang dimaksud efek rumah kaca?',
            orderIndex: 1,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Proses penipisan lapisan ozon', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Gas-gas atmosfer menangkap panas matahari sehingga bumi lebih hangat', scoreValue: 1.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Peningkatan suhu akibat kebakaran hutan', scoreValue: 0.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'Proses penguraian sampah plastik', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
          {
            questionText: 'Apa dampak perubahan iklim yang disebutkan Sari?',
            orderIndex: 2,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Berkurangnya jumlah spesies ikan', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Es kutub mencair dan naiknya permukaan air laut', scoreValue: 1.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Berkurangnya lapisan ozon', scoreValue: 0.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'Meningkatnya produksi pangan', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
          {
            questionText: 'Apa solusi yang diusulkan Andi untuk mengatasi perubahan iklim?',
            orderIndex: 3,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Membangun lebih banyak pabrik', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Mengurangi bahan bakar fosil dan menanam pohon', scoreValue: 1.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Menggunakan lebih banyak plastik', scoreValue: 0.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'Menambah jumlah kendaraan bermotor', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
        ],
      },
    },
  });

  // --- Kinesthetic Package ---
  await prisma.performancePackage.create({
    data: {
      vakDimension: 'K',
      title: 'Pemahaman Kinestetik - Instruksi Prosedur',
      slug: 'kinesthetic-prosedur-1',
      description: 'Tes pemahaman berbasis teks instruksi langkah-demi-langkah',
      genre: 'General',
      isActive: true,
      materials: {
        create: [
          {
            title: 'Prosedur Percobaan Sains Sederhana',
            content:
              'Prosedur membuat indikator pH alami dari kubis ungu:\n' +
              '1. Potong kubis ungu menjadi potongan kecil-kecil.\n' +
              '2. Rebus potongan kubis dalam 500ml air selama 15 menit hingga air berubah warna menjadi ungu tua.\n' +
              '3. Saring air rebusan dan biarkan mendingin.\n' +
              '4. Siapkan 3 gelas bening: Gelas A berisi air jeruk (asam), Gelas B berisi air sabun (basa), Gelas C berisi air mineral (netral).\n' +
              '5. Teteskan 10 tetes larutan kubis ke setiap gelas.\n' +
              '6. Amati perubahan warna: asam → merah/pink, basa → hijau/kuning, netral → tetap ungu.',
            orderIndex: 1,
          },
        ],
      },
      questions: {
        create: [
          {
            questionText: 'Berapa lama kubis harus direbus menurut prosedur di atas?',
            orderIndex: 1,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: '5 menit', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: '10 menit', scoreValue: 0.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: '15 menit', scoreValue: 1.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: '20 menit', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
          {
            questionText: 'Jika larutan kubis diteteskan ke air jeruk (asam), warna apa yang akan muncul?',
            orderIndex: 2,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Hijau', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Merah/pink', scoreValue: 1.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Tetap ungu', scoreValue: 0.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'Biru', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
          {
            questionText: 'Apa yang harus dilakukan setelah merebus kubis dan sebelum meneteskan larutan ke gelas?',
            orderIndex: 3,
            isActive: true,
            options: {
              create: [
                { optionLabel: 'A', optionText: 'Langsung teteskan ke gelas', scoreValue: 0.00, orderIndex: 1 },
                { optionLabel: 'B', optionText: 'Tambahkan garam ke rebusan', scoreValue: 0.00, orderIndex: 2 },
                { optionLabel: 'C', optionText: 'Saring air rebusan dan biarkan mendingin', scoreValue: 1.00, orderIndex: 3 },
                { optionLabel: 'D', optionText: 'Buang potongan kubis dan rebus ulang', scoreValue: 0.00, orderIndex: 4 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✅ 3 Performance packages seeded (V, A, K — each with 3 text-based questions)\n');

  console.log('🎉 Seeding v2 completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
