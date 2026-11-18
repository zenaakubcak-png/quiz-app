// Обрано Vue 3 через CDN та Canvas API з requestAnimationFrame (варіант 8: анімований таймер зворотного відліку у вигляді дуги ctx.arc()).

const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';
const LOCAL_STORAGE_KEY = 'quizResults_variant8';
const MIGRATED_FLAG_KEY = 'quizResults_migrated_to_idb_v1';
const DB_NAME = 'QuizDB';
const DB_VERSION = 1;
const STORE_NAME = 'results';
const QUESTION_TIME_LIMIT_MS = 15000;

// Зберігає масив результатів у localStorage у вигляді JSON-рядка
function saveToLocalStorage(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Помилка запису в localStorage:', error);
  }
}

// Зчитує масив результатів із localStorage з безпечним розбором JSON через try/catch
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Пошкоджені дані в localStorage:', error);
    return [];
  }
}

// Відкриває базу даних IndexedDB та створює об'єктне сховище "results" з автоінкрементом ключа id
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB не підтримується у цьому середовищі або режимі перегляду'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Не вдалося відкрити базу IndexedDB'));
  });
}

// Додає новий запис результату в об'єктне сховище "results" у транзакції readwrite
async function addItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const payload = {
      date: item.date,
      score: item.score,
      total: item.total
    };
    const request = store.add(payload);

    request.onsuccess = () => resolve(request.result);
    tx.onerror = () => reject(tx.error || new Error('Помилка додавання запису в IndexedDB'));
    tx.onabort = () => reject(tx.error || new Error('Транзакцію додавання скасовано'));
  });
}

// Оновлює існуючий запис за keyPath ("id") через put у транзакції readwrite
async function updateItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    tx.onerror = () => reject(tx.error || new Error('Помилка оновлення запису в IndexedDB'));
  });
}

// Повертає всі записи зі сховища "results" у транзакції readonly
async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error('Помилка читання записів з IndexedDB'));
  });
}

// Видаляє запис за ключем id зі сховища "results" у транзакції readwrite
async function deleteItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Помилка видалення запису з IndexedDB'));
  });
}

// Одноразово переносить дані з localStorage у порожнє сховище IndexedDB та позначає міграцію прапорцем
async function migrateLocalStorageToIndexedDB() {
  const alreadyMigrated = localStorage.getItem(MIGRATED_FLAG_KEY) === 'true';
  if (alreadyMigrated) return;

  const existingItems = await getAllItems();
  const localItems = loadFromLocalStorage();

  if (existingItems.length === 0 && localItems.length > 0) {
    for (const entry of localItems) {
      await addItem({
        date: entry.date || new Date().toLocaleDateString('uk-UA'),
        score: Number(entry.score) || 0,
        total: Number(entry.total) || 0
      });
    }
  }

  localStorage.setItem(MIGRATED_FLAG_KEY, 'true');
}

// Допоміжна функція розкодування HTML-сутностей (&quot;, &#039;, &amp; тощо) з Open Trivia Database
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return '';
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(text, 'text/html');
  return parsedDoc.documentElement.textContent ?? '';
}

// Допоміжна функція перемішування варіантів відповіді (алгоритм Фішера — Єйтса)
function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Компонент QuizQuestion (Варіант 8): отримує дані через props і сповіщає батька подією 'answer'
const QuizQuestion = {
  props: {
    question: {
      type: String,
      required: true
    },
    options: {
      type: Array,
      required: true
    },
    correctIndex: {
      type: Number,
      required: true
    }
  },
  emits: ['answer'],
  template: `
    <div class="quiz-question-card">
      <p id="question-text">{{ question }}</p>
      <div class="options">
        <button
          v-for="(optionText, index) in options"
          :key="index"
          type="button"
          class="option-btn"
          @click="$emit('answer', index)"
        >
          <span class="option-label">{{ optionText }}</span>
        </button>
      </div>
    </div>
  `
};

Vue.createApp({
  components: {
    QuizQuestion
  },
  data() {
    return {
      questions: [
        {
          id: 1,
          question: 'Яке ключове слово використовується для оголошення змінної в JavaScript?',
          options: ['var', 'let', 'def'],
          correctIndex: 1,
          answer: 'let',
          answered: false
        },
        {
          id: 2,
          question: 'Який тип даних використовується для тексту?',
          options: ['number', 'string', 'boolean'],
          correctIndex: 1,
          answer: 'string',
          answered: false
        },
        {
          id: 3,
          question: 'Який результат typeof 5?',
          options: ['number', 'string', 'object'],
          correctIndex: 0,
          answer: 'number',
          answered: false
        },
        {
          id: 4,
          question: 'Чи мають стрілкові функції власний this?',
          options: ['так', 'лише у strict mode', 'ні'],
          correctIndex: 2,
          answer: 'ні',
          answered: false
        }
      ],
      results: [],
      currentIndex: 0,
      score: 0,
      feedback: 'Оберіть варіант відповіді, клікнувши по ньому.',
      isLoading: false,
      errorMessage: '',
      storageError: '',
      remainingMs: QUESTION_TIME_LIMIT_MS,
      isTimerPaused: false,
      rafId: null,
      lastFrameTime: null
    };
  },
  computed: {
    currentQuestion() {
      return this.questions[this.currentIndex] || null;
    },
    progressPercent() {
      if (!this.questions.length) return 0;
      return Math.round(((this.currentIndex + 1) / this.questions.length) * 100);
    },
    remainingSeconds() {
      return Math.max(0, Math.ceil(this.remainingMs / 1000));
    },
    sortedResults() {
      return [...this.results].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.total - a.total;
      });
    }
  },
  methods: {
    // Зупиняє активний цикл requestAnimationFrame, щоб уникнути зайвого навантаження
    stopTimerAnimation() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.lastFrameTime = null;
    },
    // Скидає таймер поточного питання та запускає цикл перемальовування на Canvas
    resetAndStartTimer() {
      this.stopTimerAnimation();
      this.remainingMs = QUESTION_TIME_LIMIT_MS;
      this.isTimerPaused = false;
      this.drawCountdownArc(1);
      this.rafId = requestAnimationFrame(this.stepTimerFrame);
    },
    // Перемикає паузу/продовження таймера та коректно зупиняє або відновлює requestAnimationFrame
    toggleTimer() {
      if (this.isTimerPaused) {
        this.isTimerPaused = false;
        this.lastFrameTime = null;
        this.rafId = requestAnimationFrame(this.stepTimerFrame);
      } else {
        this.isTimerPaused = true;
        this.stopTimerAnimation();
        this.drawCountdownArc(this.remainingMs / QUESTION_TIME_LIMIT_MS);
      }
    },
    // Кадр анімації через requestAnimationFrame: оновлює залишок часу та малює дугу через ctx.arc()
    stepTimerFrame(timestamp) {
      if (this.isTimerPaused) {
        this.stopTimerAnimation();
        return;
      }

      if (this.lastFrameTime === null) {
        this.lastFrameTime = timestamp;
      }

      const deltaMs = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      this.remainingMs = Math.max(0, this.remainingMs - deltaMs);

      const ratio = this.remainingMs / QUESTION_TIME_LIMIT_MS;
      this.drawCountdownArc(ratio);

      if (this.remainingMs > 0) {
        this.rafId = requestAnimationFrame(this.stepTimerFrame);
      } else {
        this.stopTimerAnimation();
        this.feedback = `Час на питання ${this.currentIndex + 1} вичерпано. Натисніть «Наступне питання».`;
      }
    },
    // Очищає Canvas і малює зменшувану дугу зворотного відліку через ctx.arc()
    drawCountdownArc(ratio) {
      const canvas = document.querySelector('#countdown-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const clampedRatio = Math.max(0, Math.min(1, ratio));
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 10;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#e9ecef';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * clampedRatio;

      ctx.strokeStyle = clampedRatio > 0.25 ? '#6f42c1' : '#c62828';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
    },
    async refreshResultsFromDB() {
      try {
        this.storageError = '';
        await migrateLocalStorageToIndexedDB();
        const items = await getAllItems();
        this.results = items;
        saveToLocalStorage(items);
      } catch (error) {
        console.error('Помилка роботи з IndexedDB:', error);
        this.storageError = 'Локальна база результатів (IndexedDB) недоступна у цьому браузері або режимі перегляду.';
      }
    },
    async finishAndSaveResult() {
      const record = {
        date: new Date().toLocaleDateString('uk-UA'),
        score: this.score,
        total: this.questions.length
      };

      const updatedLocal = [...loadFromLocalStorage(), { id: Date.now(), ...record }];
      saveToLocalStorage(updatedLocal);

      try {
        this.storageError = '';
        await addItem(record);
        this.results = await getAllItems();
        this.feedback = `Результат ${record.score}/${record.total} збережено у сховище «results».`;
      } catch (error) {
        console.error('Помилка збереження результату в IndexedDB:', error);
        this.storageError = 'Не вдалося зберегти результат у IndexedDB. Перевірте доступність локального сховища браузера.';
      }
    },
    async removeResult(id) {
      try {
        this.storageError = '';
        await deleteItem(id);
        this.results = await getAllItems();
        saveToLocalStorage(this.results);
      } catch (error) {
        console.error('Помилка видалення результату з IndexedDB:', error);
        this.storageError = 'Не вдалося видалити запис із бази IndexedDB.';
      }
    },
    async updateResultScore(item, newScore) {
      try {
        this.storageError = '';
        await updateItem({ ...item, score: newScore });
        this.results = await getAllItems();
        saveToLocalStorage(this.results);
      } catch (error) {
        console.error('Помилка оновлення результату в IndexedDB:', error);
        this.storageError = 'Не вдалося оновити запис у базі IndexedDB.';
      }
    },
    async handleAnswer(selectedIndex) {
      const current = this.currentQuestion;
      if (!current) return;

      this.stopTimerAnimation();

      const isCorrect = selectedIndex === current.correctIndex;
      if (!current.answered && isCorrect) {
        this.score += 1;
      }
      current.answered = true;

      this.feedback = isCorrect
        ? `Правильно! Відповідь «${current.options[selectedIndex]}» зараховано (рахунок: ${this.score}/${this.questions.length}).`
        : `Неправильно. Ви обрали «${current.options[selectedIndex]}», правильна відповідь: «${current.answer}» (рахунок: ${this.score}/${this.questions.length}).`;

      const allAnswered = this.questions.length > 0 && this.questions.every((q) => q.answered);
      if (allAnswered) {
        await this.finishAndSaveResult();
      }
    },
    nextQuestion() {
      if (!this.questions.length) return;
      this.currentIndex = (this.currentIndex + 1) % this.questions.length;
      this.feedback = `Перейшли до питання ${this.currentIndex + 1}. Оберіть варіант відповіді.`;
      this.resetAndStartTimer();
    },
    async loadQuestionsFromApi() {
      this.errorMessage = '';
      this.isLoading = true;

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`HTTP-запит завершився зі статусом ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.results) || data.response_code !== 0 || data.results.length === 0) {
          throw new Error('API повернуло порожній або некоректний список питань');
        }

        this.questions = data.results.map((rawItem, idx) => {
          const decodedQuestion = decodeHtmlEntities(rawItem.question);
          const decodedCorrect = decodeHtmlEntities(rawItem.correct_answer);
          const decodedIncorrect = Array.isArray(rawItem.incorrect_answers)
            ? rawItem.incorrect_answers.map((ans) => decodeHtmlEntities(ans))
            : [];

          const mixedOptions = shuffleArray([decodedCorrect, ...decodedIncorrect]);
          const correctIndex = mixedOptions.indexOf(decodedCorrect);

          return {
            id: idx + 1,
            question: decodedQuestion,
            options: mixedOptions,
            correctIndex: correctIndex >= 0 ? correctIndex : 0,
            answer: decodedCorrect,
            answered: false
          };
        });

        this.currentIndex = 0;
        this.score = 0;
        this.feedback = 'Завантажено нові питання з Open Trivia Database. Оберіть варіант відповіді.';
        this.resetAndStartTimer();
      } catch (error) {
        console.error('Помилка завантаження даних з Open Trivia Database:', error);
        this.errorMessage = 'Не вдалося завантажити питання з сервісу вікторини. Перевірте з’єднання з інтернетом і натисніть «Оновити».';
      } finally {
        this.isLoading = false;
      }
    }
  },
  async mounted() {
    this.resetAndStartTimer();
    await this.refreshResultsFromDB();
    await this.loadQuestionsFromApi();
  },
  beforeUnmount() {
    this.stopTimerAnimation();
  }
}).mount('#app');