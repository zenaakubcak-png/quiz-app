// Константа ендпоінта публічного API для варіанту 8 (Open Trivia Database)
const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';

// Перевірка підключення
// Виводимо повідомлення, щоб переконатися, що файл успішно підключено до HTML
console.log('script.js підключено');

// Видаляємо статичний приклад елемента зі списку на старті роботи скрипта
const staticExample = document.querySelector('#questions-list .static-example');
if (staticExample) {
  staticExample.remove();
}

// Початковий масив об'єктів з питаннями вікторини (оновлюється даними з API)
let quizData = [
  {
    question: "Яке ключове слово використовується для оголошення змінної в JavaScript?",
    options: ["var", "let", "def"],
    correctIndex: 1,
    answer: "let",
    answered: false
  },
  {
    question: "Який тип даних використовується для тексту?",
    options: ["number", "string", "boolean"],
    correctIndex: 1,
    answer: "string",
    answered: false
  },
  {
    question: "Який результат typeof 5?",
    options: ["number", "string", "object"],
    correctIndex: 0,
    answer: "number",
    answered: false
  },
  {
    question: "Чи мають стрілкові функції власний this?",
    options: ["так", "лише у strict mode", "ні"],
    correctIndex: 2,
    answer: "ні",
    answered: false
  }
];

// Обираємо елементи DOM для списку питань, підсумку, інтерактивної форми та станів API
const listContainer = document.querySelector('#questions-list');
const questionsCountEl = document.querySelector('#questions-count');
const quizForm = document.querySelector('#quiz-form');
const nextQuestionBtn = document.querySelector('#next-question-btn');
const questionTextEl = document.querySelector('#question-text');
const questionNumberEl = document.querySelector('.question-number');
const progressBarEl = document.querySelector('.progress-bar');
const feedbackEl = document.querySelector('#quiz-feedback');
const optionLabels = document.querySelectorAll('#quiz-form .option-label');
const refreshApiBtn = document.querySelector('#refresh-api-btn');
const loadingStatusEl = document.querySelector('#loading-status');
const apiErrorEl = document.querySelector('#api-error');

let currentQuestionIndex = 0;
let savedCorrectCount = 0;

// Розкодовує HTML-сутності (&quot;, &#039;, &amp; тощо) з рядків відповіді Open Trivia Database
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return '';
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(text, 'text/html');
  return parsedDoc.documentElement.textContent ?? '';
}

// Перемішує копію масиву варіантів відповіді (алгоритм Фішера — Єйтса)
function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Керує видимістю індикатора завантаження та станом кнопки «Оновити»
function setLoadingState(isLoading) {
  if (loadingStatusEl) {
    loadingStatusEl.hidden = !isLoading;
  }
  if (refreshApiBtn) {
    refreshApiBtn.disabled = isLoading;
  }
}

// Відображає або приховує зрозуміле повідомлення про помилку для користувача
function showErrorMessage(message) {
  if (!apiErrorEl) return;
  if (!message) {
    apiErrorEl.textContent = '';
    apiErrorEl.hidden = true;
    return;
  }
  apiErrorEl.textContent = message;
  apiErrorEl.hidden = false;
}

// Функція рендеру списку питань у DOM (повторно використана з практикуму 7)
// Очищає контейнер, створює елементи <li> для кожного питання, додає data-answer та умовний клас
function renderQuestions(questions) {
  if (!listContainer) return;

  listContainer.innerHTML = '';

  questions.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.textContent = item.question;
    listItem.dataset.answer = item.answer;

    if (item.answered) {
      listItem.classList.add('answered');
    }

    listContainer.append(listItem);
  });

  if (questionsCountEl) {
    questionsCountEl.textContent = `Всього питань: ${questions.length} | Збережено правильних: ${savedCorrectCount}`;
  }
}

// Функція оновлення картки поточного питання та індикатора прогресу
function renderCurrentQuestion(index) {
  const currentItem = quizData[index];
  if (!currentItem) return;

  if (questionTextEl) {
    questionTextEl.textContent = currentItem.question;
  }

  if (questionNumberEl) {
    questionNumberEl.textContent = `Питання ${index + 1} з ${quizData.length}`;
  }

  if (progressBarEl) {
    const percent = Math.round(((index + 1) / quizData.length) * 100);
    progressBarEl.style.width = `${percent}%`;
  }

  optionLabels.forEach((labelEl, idx) => {
    const optionText = currentItem.options[idx];
    const parentLabel = labelEl.closest('.option-btn');
    const radioInput = parentLabel ? parentLabel.querySelector('input[type="radio"]') : null;

    if (optionText !== undefined) {
      labelEl.textContent = optionText;
      if (parentLabel) parentLabel.hidden = false;
      if (radioInput) radioInput.disabled = false;
    } else {
      labelEl.textContent = '';
      if (parentLabel) parentLabel.hidden = true;
      if (radioInput) {
        radioInput.checked = false;
        radioInput.disabled = true;
      }
    }
  });
}

// Завантажує питання вікторини з публічного API Open Trivia Database: https://opentdb.com/api.php?amount=10&type=multiple
async function loadData() {
  showErrorMessage('');
  setLoadingState(true);

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP-запит завершився зі статусом ${response.status}`);
    }

    const data = await response.json();
    console.log('Отримані дані з Open Trivia Database:', data);

    if (!data || !Array.isArray(data.results) || data.response_code !== 0 || data.results.length === 0) {
      throw new Error('API повернуло порожній або некоректний список питань');
    }

    const mappedQuestions = data.results.map((rawItem) => {
      const decodedQuestion = decodeHtmlEntities(rawItem.question);
      const decodedCorrect = decodeHtmlEntities(rawItem.correct_answer);
      const decodedIncorrect = Array.isArray(rawItem.incorrect_answers)
        ? rawItem.incorrect_answers.map((ans) => decodeHtmlEntities(ans))
        : [];

      const mixedOptions = shuffleArray([decodedCorrect, ...decodedIncorrect]);
      const correctIndex = mixedOptions.indexOf(decodedCorrect);

      return {
        question: decodedQuestion,
        options: mixedOptions,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        answer: decodedCorrect,
        answered: false
      };
    });

    quizData = mappedQuestions;
    currentQuestionIndex = 0;
    savedCorrectCount = 0;

    renderQuestions(quizData);
    renderCurrentQuestion(currentQuestionIndex);

    if (quizForm) {
      quizForm.reset();
    }

    if (feedbackEl) {
      feedbackEl.textContent = 'Завантажено нові питання з Open Trivia Database. Оберіть варіант відповіді.';
    }
  } catch (error) {
    console.error('Помилка завантаження даних з Open Trivia Database:', error);
    showErrorMessage('Не вдалося завантажити питання з сервісу вікторини. Перевірте з’єднання з інтернетом і натисніть «Оновити».');
  } finally {
    setLoadingState(false);
  }
}

// Початковий рендер до завершення запиту та запуск завантаження з API
renderQuestions(quizData);
renderCurrentQuestion(currentQuestionIndex);
loadData();

// Повторний виклик loadData() по натисканню кнопки «Оновити»
if (refreshApiBtn) {
  refreshApiBtn.addEventListener('click', () => {
    loadData();
  });
}

// Обробник надсилання форми (submit)
// Скасовує перезавантаження сторінки, перевіряє обраний радіо-варіант та оновлює стан і список
quizForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const checkedRadio = quizForm.querySelector('input[name="quizOption"]:checked');
  if (!checkedRadio) {
    quizForm.reportValidity();
    return;
  }

  const chosenIndex = Number(checkedRadio.value);
  const currentItem = quizData[currentQuestionIndex];
  if (!currentItem) return;

  const isCorrect = chosenIndex === currentItem.correctIndex;

  if (!currentItem.answered && isCorrect) {
    savedCorrectCount++;
  }
  currentItem.answered = true;

  if (feedbackEl) {
    feedbackEl.textContent = isCorrect
      ? `Правильно! Відповідь «${currentItem.options[chosenIndex]}» зараховано (рахунок: ${savedCorrectCount}/${quizData.length}).`
      : `Неправильно. Ви обрали «${currentItem.options[chosenIndex]}», правильна відповідь: «${currentItem.answer}» (рахунок: ${savedCorrectCount}/${quizData.length}).`;
  }

  console.log(`Питання #${currentQuestionIndex + 1}: chosenIndex=${chosenIndex}, correctIndex=${currentItem.correctIndex}, результат=${isCorrect}`);

  renderQuestions(quizData);
});

// Обробник кліку по кнопці «Наступне питання» (click)
// Перемикає поточне питання по колу та скидає вибір радіокнопок через form.reset()
nextQuestionBtn.addEventListener('click', () => {
  if (!quizData.length) return;
  currentQuestionIndex = (currentQuestionIndex + 1) % quizData.length;
  renderCurrentQuestion(currentQuestionIndex);
  quizForm.reset();

  if (feedbackEl) {
    feedbackEl.textContent = `Перейшли до питання ${currentQuestionIndex + 1}. Оберіть варіант відповіді.`;
  }
});