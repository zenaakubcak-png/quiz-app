// Крок 9: Перемкнуто на локальний ендпоінт замість зовнішнього API
const API_BASE_URL = '/api/questions';
const LOCAL_STORAGE_KEY = 'quizResults_variant8';
const MIGRATED_FLAG_KEY = 'quizResults_migrated_to_idb_v1';
const DB_NAME = 'QuizDB';
const DB_VERSION = 1;
const STORE_NAME = 'results';
const QUESTION_TIME_LIMIT_MS = 15000;

const CATEGORIES = [
  { id: '', label: 'Будь-яка категорія' },
  { id: '9', label: 'Загальні знання (General Knowledge)' },
  { id: '18', label: 'Комп’ютери та IT (Science: Computers)' },
  { id: '15', label: 'Відеоігри (Entertainment: Video Games)' },
  { id: '21', label: 'Спорт (Sports)' }
];

const appContainer = document.querySelector('#app');

const state = {
  selectedCategory: '',
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
  feedback: 'Оберіть варіант відповіді та натисніть «Перевірити відповідь».',
  isLoading: false,
  errorMessage: '',
  storageError: '',
  remainingMs: QUESTION_TIME_LIMIT_MS,
  isTimerPaused: false,
  rafId: null,
  lastFrameTime: null
};

// Зупиняє анімаційний цикл requestAnimationFrame для Canvas-таймера
function stopTimerAnimation() {
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  state.lastFrameTime = null;
}

// Малює дугу зворотного відліку через ctx.arc() на Canvas
function drawCountdownArc(ratio) {
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
}

// Оновлює лічильник секунд на екрані без перемальовування всієї сторінки
function syncTimerLabel() {
  const secondsEl = document.querySelector('.timer-seconds');
  if (secondsEl) {
    secondsEl.textContent = `${Math.max(0, Math.ceil(state.remainingMs / 1000))} сек`;
  }
}

// Крок анімації таймера у циклі requestAnimationFrame
function stepTimerFrame(timestamp) {
  if (state.isTimerPaused || location.pathname !== '/quiz') {
    stopTimerAnimation();
    return;
  }

  if (state.lastFrameTime === null) {
    state.lastFrameTime = timestamp;
  }

  const deltaMs = timestamp - state.lastFrameTime;
  state.lastFrameTime = timestamp;
  state.remainingMs = Math.max(0, state.remainingMs - deltaMs);

  drawCountdownArc(state.remainingMs / QUESTION_TIME_LIMIT_MS);
  syncTimerLabel();

  if (state.remainingMs > 0) {
    state.rafId = requestAnimationFrame(stepTimerFrame);
  } else {
    stopTimerAnimation();
    state.feedback = `Час на питання ${state.currentIndex + 1} вичерпано. Натисніть «Наступне питання».`;
    const fb = document.querySelector('#quiz-feedback');
    if (fb) fb.textContent = state.feedback;
  }
}

// Запускає або скидає таймер поточного питання
function resetAndStartTimer() {
  stopTimerAnimation();
  state.remainingMs = QUESTION_TIME_LIMIT_MS;
  state.isTimerPaused = false;
  drawCountdownArc(1);
  syncTimerLabel();
  if (location.pathname === '/quiz') {
    state.rafId = requestAnimationFrame(stepTimerFrame);
  }
}

// Перемикає паузу або продовження таймера
function toggleTimer() {
  const btn = document.querySelector('#toggle-timer-btn');
  if (state.isTimerPaused) {
    state.isTimerPaused = false;
    state.lastFrameTime = null;
    if (btn) btn.textContent = 'Пауза таймера';
    state.rafId = requestAnimationFrame(stepTimerFrame);
  } else {
    state.isTimerPaused = true;
    stopTimerAnimation();
    if (btn) btn.textContent = 'Продовжити таймер';
    drawCountdownArc(state.remainingMs / QUESTION_TIME_LIMIT_MS);
  }
}

// Зберігає масив результатів у localStorage
function saveToLocalStorage(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Помилка запису в localStorage:', error);
  }
}

// Зчитує масив результатів із localStorage з обробкою пошкодженого JSON
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

// Відкриває базу IndexedDB QuizDB (версія 1) зі сховищем "results"
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступна у цьому середовищі'));
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
    request.onerror = () => reject(request.error || new Error('Не вдалося відкрити IndexedDB'));
  });
}

// Додає результат проходження до сховища "results"
async function addItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add({
      date: item.date,
      score: item.score,
      total: item.total
    });

    request.onsuccess = () => resolve(request.result);
    tx.onerror = () => reject(tx.error || new Error('Помилка додавання запису'));
  });
}

// Отримує всі результати проходжень зі сховища "results"
async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error('Помилка читання записів'));
  });
}

// Видаляє результат за id зі сховища "results"
async function deleteItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(Number(id));

    request.onsuccess = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Помилка видалення запису'));
  });
}

// Одноразова міграція даних із localStorage в IndexedDB
async function migrateLocalStorageToIndexedDB() {
  if (localStorage.getItem(MIGRATED_FLAG_KEY) === 'true') return;

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

// Завантажує та оновлює список результатів із IndexedDB
async function syncResultsFromStorage() {
  try {
    state.storageError = '';
    await migrateLocalStorageToIndexedDB();
    const items = await getAllItems();
    state.results = [...items].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.total - a.total;
    });
    saveToLocalStorage(state.results);
  } catch (error) {
    console.error('Помилка роботи зі сховищем результатів:', error);
    state.storageError = 'Локальне сховище результатів недоступне у цьому браузері або режимі перегляду.';
  }
}

// Декодує HTML-сутності у текстах Open Trivia Database
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  return doc.documentElement.textContent ?? '';
}

// Перемішує масив варіантів відповіді
function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Завантажує питання з Open Trivia Database з урахуванням обраної категорії
async function loadQuestionsFromApi() {
  state.errorMessage = '';
  state.isLoading = true;
  if (location.pathname === '/quiz') {
    renderQuiz();
  }

  const url = state.selectedCategory
    ? `${API_BASE_URL}?category=${encodeURIComponent(state.selectedCategory)}`
    : API_BASE_URL;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP-запит завершився зі статусом ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.results) || data.response_code !== 0 || data.results.length === 0) {
      throw new Error('API повернуло порожній або некоректний список питань');
    }

    state.questions = data.results.map((rawItem, idx) => {
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

    state.currentIndex = 0;
    state.score = 0;
    state.feedback = 'Завантажено нові питання з Open Trivia Database. Оберіть варіант відповіді.';
  } catch (error) {
    console.error('Помилка завантаження даних з Open Trivia Database:', error);
    state.errorMessage = 'Не вдалося завантажити питання з сервісу вікторини. Перевірте з’єднання з інтернетом і натисніть «Оновити».';
  } finally {
    state.isLoading = false;
    if (location.pathname === '/quiz') {
      renderQuiz();
      resetAndStartTimer();
    }
  }
}

// Зберігає поточний результат проходження в IndexedDB ("results")
async function saveCurrentQuizResult() {
  const record = {
    date: new Date().toLocaleDateString('uk-UA'),
    score: state.score,
    total: state.questions.length
  };

  try {
    state.storageError = '';
    await addItem(record);
    await syncResultsFromStorage();
    state.feedback = `Результат ${record.score}/${record.total} збережено у сховище «results».`;
  } catch (error) {
    console.error('Помилка збереження результату:', error);
    state.storageError = 'Не вдалося зберегти результат у базі даних IndexedDB.';
  }

  if (location.pathname === '/quiz') {
    const fb = document.querySelector('#quiz-feedback');
    if (fb) fb.textContent = state.feedback;
  } else if (location.pathname === '/results') {
    renderResults();
  }
}

// Повторно використовувана функція рендеру списку елементів (з практикуму 7)
function renderListItems(container, items, formatter) {
  if (!container) return;
  container.innerHTML = '';

  items.forEach((item) => {
    const li = document.createElement('li');
    formatter(li, item);
    container.append(li);
  });
}

// Повторно використовувана функція рендеру детальної картки (з практикуму 7)
function renderItemCard(container, titleText, metaLines, linkHref, linkLabel) {
  if (!container) return;
  container.innerHTML = '';

  const article = document.createElement('article');
  article.className = 'detail-card';

  const heading = document.createElement('h3');
  heading.textContent = titleText;
  article.append(heading);

  metaLines.forEach((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    article.append(p);
  });

  if (linkHref && linkLabel) {
    const link = document.createElement('a');
    link.href = linkHref;
    link.dataset.link = '';
    link.className = 'spa-btn';
    link.textContent = linkLabel;
    article.append(link);
  }

  container.append(article);
}

// Стартовий екран ("/"): вибір категорії та кнопка «Почати»
function renderHome() {
  stopTimerAnimation();
  if (!appContainer) return;

  appContainer.innerHTML = `
    <section id="start-screen" class="home-card">
      <h2>Стартовий екран вікторини</h2>
      <p>Оберіть категорію запитань із каталогу Open Trivia Database та натисніть «Почати».</p>

      <div class="category-picker">
        <label for="category-select">Категорія:</label>
        <select id="category-select">
          ${CATEGORIES.map(
            (cat) => `<option value="${cat.id}" ${state.selectedCategory === cat.id ? 'selected' : ''}>${cat.label}</option>`
          ).join('')}
        </select>
      </div>

      <div class="quiz-actions">
        <button type="button" id="start-quiz-btn" class="primary-btn">Почати</button>
        <a href="/results" data-link class="secondary-link">Переглянути збережені результати</a>
      </div>
    </section>
  `;

  const selectEl = document.querySelector('#category-select');
  const startBtn = document.querySelector('#start-quiz-btn');

  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      state.selectedCategory = e.target.value;
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      navigate('/quiz');
      await loadQuestionsFromApi();
    });
  }
}

// Екран проходження квізу ("/quiz") з fetch (практикум 9), рендером списку (практикум 7) та Canvas-таймером (практикум 12)
function renderQuiz() {
  if (!appContainer) return;
  const currentItem = state.questions[state.currentIndex] || null;
  const percent = state.questions.length
    ? Math.round(((state.currentIndex + 1) / state.questions.length) * 100)
    : 0;

  appContainer.innerHTML = `
    <section id="current-question">
      <div class="question-header">
        <span class="question-number">Питання ${state.currentIndex + 1} з ${state.questions.length}</span>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${percent}%;"></div>
        </div>
      </div>

      <div class="timer-widget" aria-live="polite">
        <canvas id="countdown-canvas" width="96" height="96"></canvas>
        <div class="timer-meta">
          <span class="timer-label">Час на відповідь</span>
          <strong class="timer-seconds">${Math.max(0, Math.ceil(state.remainingMs / 1000))} сек</strong>
          <button type="button" id="toggle-timer-btn">
            ${state.isTimerPaused ? 'Продовжити таймер' : 'Пауза таймера'}
          </button>
        </div>
      </div>

      <h2>Поточне питання</h2>
      <p id="question-text">${currentItem ? currentItem.question : 'Немає доступних питань'}</p>

      <form id="quiz-form" class="options">
        ${
          currentItem
            ? currentItem.options
                .map(
                  (opt, idx) => `
                <label class="option-btn" for="ans-${idx}">
                  <input type="radio" name="quizOption" id="ans-${idx}" value="${idx}" required>
                  <span class="option-label">${opt}</span>
                </label>
              `
                )
                .join('')
            : ''
        }

        <div class="quiz-actions">
          <button type="submit" id="submit-answer-btn">Перевірити відповідь</button>
          <button type="button" id="next-question-btn">Наступне питання</button>
          <button type="button" id="save-result-btn">Завершити та зберегти результат</button>
        </div>
      </form>

      <p id="quiz-feedback" aria-live="polite">${state.feedback}</p>
    </section>

    <section id="questions-bank">
      <h2>Список питань вікторини</h2>
      <div class="api-controls">
        <button type="button" id="refresh-api-btn" ${state.isLoading ? 'disabled' : ''}>Оновити</button>
        <span id="loading-status" aria-live="polite" ${state.isLoading ? '' : 'hidden'}>Завантаження питань з API...</span>
      </div>
      <p id="api-error" role="alert" ${state.errorMessage ? '' : 'hidden'}>${state.errorMessage}</p>
      <p id="questions-count">Всього питань: ${state.questions.length} | Збережено правильних: ${state.score}</p>
      <ul id="questions-list"></ul>
    </section>
  `;

  const listEl = document.querySelector('#questions-list');
  renderListItems(listEl, state.questions, (li, item) => {
    li.textContent = `${item.question} — Правильна відповідь: ${item.answer}`;
    li.dataset.answer = item.answer;
    if (item.answered) li.classList.add('answered');
  });

  drawCountdownArc(state.remainingMs / QUESTION_TIME_LIMIT_MS);

  const toggleBtn = document.querySelector('#toggle-timer-btn');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTimer);

  const refreshBtn = document.querySelector('#refresh-api-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadQuestionsFromApi);

  const saveBtn = document.querySelector('#save-result-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveCurrentQuizResult);

  const quizForm = document.querySelector('#quiz-form');
  if (quizForm) {
    quizForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const checkedRadio = quizForm.querySelector('input[name="quizOption"]:checked');
      if (!checkedRadio) {
        quizForm.reportValidity();
        return;
      }

      stopTimerAnimation();
      const chosenIndex = Number(checkedRadio.value);
      const item = state.questions[state.currentIndex];
      if (!item) return;

      const isCorrect = chosenIndex === item.correctIndex;
      if (!item.answered && isCorrect) {
        state.score += 1;
      }
      item.answered = true;

      state.feedback = isCorrect
        ? `Правильно! Відповідь «${item.options[chosenIndex]}» зараховано (рахунок: ${state.score}/${state.questions.length}).`
        : `Неправильно. Ви обрали «${item.options[chosenIndex]}», правильна відповідь: «${item.answer}» (рахунок: ${state.score}/${state.questions.length}).`;

      renderQuiz();

      if (state.questions.length > 0 && state.questions.every((q) => q.answered)) {
        await saveCurrentQuizResult();
      }
    });
  }

  const nextBtn = document.querySelector('#next-question-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!state.questions.length) return;
      state.currentIndex = (state.currentIndex + 1) % state.questions.length;
      state.feedback = `Перейшли до питання ${state.currentIndex + 1}. Оберіть варіант відповіді.`;
      renderQuiz();
      resetAndStartTimer();
    });
  }
}

// Екран історії результатів ("/results") зі сховища "results" (практикум 11)
async function renderResults() {
  stopTimerAnimation();
  if (!appContainer) return;

  await syncResultsFromStorage();

  appContainer.innerHTML = `
    <section id="history">
      <h2>Історія результатів проходжень</h2>
      <p id="storage-error" role="alert" ${state.storageError ? '' : 'hidden'}>${state.storageError}</p>
      <ul id="results-list" class="results-list"></ul>
      <div class="quiz-actions">
        <a href="/quiz" data-link class="secondary-link">Пройти квіз</a>
        <a href="/" data-link class="secondary-link">На головну</a>
      </div>
    </section>
  `;

  const resultsListEl = document.querySelector('#results-list');
  if (!state.results.length) {
    if (resultsListEl) {
      resultsListEl.innerHTML = '<li>Збережених результатів поки немає.</li>';
    }
    return;
  }

  renderListItems(resultsListEl, state.results, (li, item) => {
    const accuracy = item.total ? Math.round((item.score / item.total) * 100) : 0;

    const infoSpan = document.createElement('span');
    infoSpan.textContent = `${item.date} — Результат: ${item.score}/${item.total} (${accuracy}%)`;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'result-item-actions';

    const detailLink = document.createElement('a');
    detailLink.href = `/results/${item.id}`;
    detailLink.dataset.link = '';
    detailLink.textContent = 'Деталі';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete-result-btn';
    delBtn.textContent = 'Видалити';
    delBtn.addEventListener('click', async () => {
      await deleteItem(item.id);
      await renderResults();
    });

    actionsDiv.append(detailLink, delBtn);
    li.append(infoSpan, actionsDiv);
  });
}

// Екран деталей одного збереженого результату за параметром :id ("/results/:id")
async function renderResultDetail(params) {
  stopTimerAnimation();
  if (!appContainer) return;

  await syncResultsFromStorage();
  const targetId = Number(params.id);
  const record = state.results.find((r) => Number(r.id) === targetId);

  appContainer.innerHTML = '<section id="result-detail"></section>';
  const detailSection = document.querySelector('#result-detail');

  if (!record) {
    renderNotFound('Запис результату з таким ідентифікатором не знайдено.');
    return;
  }

  const accuracy = record.total ? Math.round((record.score / record.total) * 100) : 0;
  renderItemCard(
    detailSection,
    `Результат проходження #${record.id}`,
    [
      `Дата: ${record.date}`,
      `Правильних відповідей: ${record.score} з ${record.total}`,
      `Точність: ${accuracy}%`
    ],
    '/results',
    'Назад до списку результатів'
  );
}

// Екран 404 для неіснуючих маршрутів
function renderNotFound(customMessage) {
  stopTimerAnimation();
  if (!appContainer) return;

  appContainer.innerHTML = `
    <section id="not-found" class="home-card">
      <h2>404 — Сторінку не знайдено</h2>
      <p>${customMessage || 'Запитаний маршрут не існує в застосунку.'}</p>
      <a href="/" data-link class="secondary-link">Повернутися на головну</a>
    </section>
  `;
}

// Таблиця маршрутів SPA для варіанта 8 (стартовий екран, процес квізу, історія результатів та деталі запису за :id)
const routes = [
  { path: '/', view: renderHome },
  { path: '/quiz', view: renderQuiz },
  { path: '/results', view: renderResults },
  { path: '/results/:id', view: renderResultDetail }
];

// Зіставляє поточний шлях із патернами таблиці маршрутів і витягує параметри (:id)
function matchRoute(path) {
  const cleanPath = (path || '/').split('?')[0].split('#')[0] || '/';
  const pathParts = cleanPath.split('/').filter(Boolean);

  for (const route of routes) {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    const isMatch = routeParts.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[index];
        return true;
      }
      return part === pathParts[index];
    });

    if (isMatch) {
      return { view: route.view, params };
    }
  }

  return null;
}

// Рендерить активний маршрут у контейнер #app
function renderRoute(path = location.pathname) {
  const matched = matchRoute(path);
  if (!matched) {
    renderNotFound();
    return;
  }
  matched.view(matched.params);
}

// Змінює URL через History API та запускає рендер без перезавантаження сторінки
function navigate(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (location.pathname !== normalized) {
    history.pushState(null, '', normalized);
  }
  renderRoute(normalized);
}

// Перехоплення кліків по внутрішніх посиланнях з атрибутом data-link
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-link]');
  if (!link) return;
  event.preventDefault();
  navigate(link.getAttribute('href'));
});

// Обробка кнопок «Назад» і «Вперед» браузера через popstate
window.addEventListener('popstate', () => {
  renderRoute(location.pathname);
});

// Початковий запуск роутера після завантаження DOM
window.addEventListener('DOMContentLoaded', async () => {
  await syncResultsFromStorage();
  renderRoute(location.pathname);
});