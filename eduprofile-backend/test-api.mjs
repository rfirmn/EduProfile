import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/v1';

// Utilities for styling console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function logStep(step, message) {
  console.log(`\n${colors.cyan}--- [Langkah ${step}] ${message} ---${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ BERHASIL:${colors.reset} ${message}`);
}

function logError(message, details = '') {
  console.error(`${colors.red}❌ GAGAL:${colors.reset} ${message}`);
  if (details) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

// Generate random email to avoid duplicate errors on repeated tests
const randomId = Math.floor(Math.random() * 100000);
const testUser = {
  email: `testuser${randomId}@example.com`,
  password: 'Password123!',
};

let authToken = '';
let sessionId = '';
let selfPerceptionQuestions = [];
let performancePackages = []; // Will store V, A, K packages
let resultId = '';

async function apiRequest(method, endpoint, body = null, requireAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (requireAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      logError(`API Error pada ${method} ${endpoint}`, data);
    }
    return data.data || data; // handle our interceptor envelope
  } catch (err) {
    logError(`Gagal melakukan request ke ${endpoint}`, err.message);
  }
}

async function runTest() {
  console.log(`${colors.magenta}==========================================`);
  console.log(`🚀 MEMULAI OTOMATISASI PENGETESAN API VAK`);
  console.log(`==========================================${colors.reset}`);

  // 1. REGISTER
  logStep(1, 'Register User Baru');
  const registerRes = await apiRequest('POST', '/auth/register', testUser, false);
  logSuccess(`User terdaftar dengan email: ${registerRes.user.email}`);

  // 2. LOGIN
  logStep(2, 'Login User');
  const loginRes = await apiRequest('POST', '/auth/login', testUser, false);
  authToken = loginRes.token;
  logSuccess('Login berhasil, token didapatkan.');

  // 3. CREATE PROFILE
  logStep(3, 'Create Profile');
  const profilePayload = {
    full_name: 'Testing Otomatis',
    occupation: 'mahasiswa',
    gender: 'prefer_not_to_say'
  };
  await apiRequest('POST', '/profile', profilePayload);
  logSuccess('Profil berhasil dibuat.');

  // 4. CREATE TEST SESSION
  logStep(4, 'Create Test Session');
  const sessionRes = await apiRequest('POST', '/test/sessions');
  sessionId = sessionRes.session_id;
  performancePackages = sessionRes.package_selections;
  logSuccess(`Test Session dibuat dengan ID: ${sessionId}`);
  console.log('   Paket yang terpilih:', performancePackages.map(p => p.vak_dimension).join(', '));

  // 5. GET SELF-PERCEPTION QUESTIONS
  logStep(5, 'Get Self-Perception Questions');
  const spQuestionsRes = await apiRequest('GET', '/test/self-perception/questions');
  selfPerceptionQuestions = spQuestionsRes.questions;
  logSuccess(`Mendapatkan ${selfPerceptionQuestions.length} pertanyaan self-perception.`);

  if (selfPerceptionQuestions.length === 0) {
    logError("Soal self-perception kosong. Pastikan Anda sudah menjalankan 'npm run prisma:seed'!");
  }

  // 6. SUBMIT SELF-PERCEPTION
  logStep(6, 'Submit Jawaban Self-Perception');
  const spAnswers = selfPerceptionQuestions.map((q) => ({
    question_id: q.id,
    essay_text: `Ini adalah jawaban otomatis minimum 20 karakter untuk soal ${q.order_index}.`,
  }));
  await apiRequest('POST', `/test/sessions/${sessionId}/self-perception/submit`, { answers: spAnswers });
  logSuccess('Jawaban self-perception berhasil disubmit.');

  // 7. PERFORMANCE TESTS (V, A, K)
  const dimensions = ['V', 'A', 'K'];
  for (const dim of dimensions) {
    logStep(`7-${dim}`, `Tes Performance Dimensi ${dim}`);

    // Start
    await apiRequest('POST', `/test/sessions/${sessionId}/performance/start`, { vak_dimension: dim });
    logSuccess(`Sub-test ${dim} dimulai (Timer berjalan).`);

    // Get Data (Questions)
    const perfData = await apiRequest('GET', `/test/sessions/${sessionId}/performance/${dim}`);
    const questions = perfData.questions;
    logSuccess(`Mendapatkan ${questions.length} soal untuk dimensi ${dim}.`);

    if (questions.length === 0) {
      logError(`Soal performance kosong untuk paket ${dim}. Pastikan seeding sudah dilakukan.`);
    }

    // Submit Answers
    for (const q of questions) {
      // Pilih opsi pertama (index 0) secara acak sebagai jawaban
      const selectedOptionId = q.options[0]?.id;
      await apiRequest('POST', `/test/sessions/${sessionId}/performance/${dim}/answer`, {
        question_id: q.id,
        selected_option_id: selectedOptionId,
        time_spent_ms: 1500, // pura-pura butuh 1.5 detik per soal
      });
    }
    logSuccess(`Berhasil mensubmit ${questions.length} jawaban untuk dimensi ${dim}.`);

    // Complete Performance
    const completeRes = await apiRequest('POST', `/test/sessions/${sessionId}/performance/${dim}/complete`, {
      reason: 'completed'
    });
    logSuccess(`Sub-test ${dim} diselesaikan.`);

    if (completeRes.session_completed) {
      logSuccess('🎉 SELURUH SESI TEST TELAH SELESAI!');
    }
  }

  // 8. GET RESULT
  logStep(8, 'Get Final Test Result');
  console.log(`${colors.yellow}   Menunggu AI memproses hasil (jeda 3 detik)...${colors.reset}`);
  await new Promise(resolve => setTimeout(resolve, 3000)); // wait for async AI processing

  const resultRes = await apiRequest('GET', `/test/sessions/${sessionId}/result`);
  if (resultRes.result_status === 'processing') {
    console.log(`${colors.yellow}   Status masih processing. Coba hit API result secara manual nanti.${colors.reset}`);
  } else {
    logSuccess('Hasil Test Berhasil Didapatkan:');
    console.log(`   - Dominant Style: ${colors.green}${resultRes.dominant_style}${colors.reset}`);
    console.log(`   - Learning Pace: ${colors.cyan}${resultRes.learning_pace}${colors.reset}`);
    console.log(`   - Skor Final VAK: V=${resultRes.scores.final.V}, A=${resultRes.scores.final.A}, K=${resultRes.scores.final.K}`);
  }

  console.log(`\n${colors.magenta}==========================================`);
  console.log(`🎉 SEMUA API ENDPOINT BERHASIL DITES TANPA ERROR!`);
  console.log(`==========================================${colors.reset}\n`);
}

runTest();
