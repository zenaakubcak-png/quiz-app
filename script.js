// Перевірка підключення
// Виводимо повідомлення, щоб переконатися, що файл успішно підключено до HTML
console.log('script.js підключено');

// Видаляємо статичний приклад елемента зі списку на старті роботи скрипта
const staticExample = document.querySelector('#questions-list .static-example');
if (staticExample) {
  staticExample.remove();
}

// Оголошення даних свого варіанта
// Масив об'єктів з питаннями вікторини, варіантами вибору та індексом правильної відповіді
const quizData = [
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

// Обираємо елементи DOM для списку питань, підсумку та інтерактивної форми
const listContainer = document.querySelector('#questions-list');
const questionsCountEl = document.querySelector('#questions-count');
const quizForm = document.querySelector('#quiz-form');
const nextQuestionBtn = document.querySelector('#next-question-btn');
const questionTextEl = document.querySelector('#question-text');
const questionNumberEl = document.querySelector('.question-number');
const progressBarEl = document.querySelector('.progress-bar');
const feedbackEl = document.querySelector('#quiz-feedback');
const optionLabels = document.querySelectorAll('#quiz-form .option-label');

let currentQuestionIndex = 0;
let savedCorrectCount = 0;

// Функція рендеру списку питань у DOM
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
    labelEl.textContent = currentItem.options[idx] ?? '';
  });
}

// Викликаємо початковий рендер списку питань та поточного питання
renderQuestions(quizData);
renderCurrentQuestion(currentQuestionIndex);

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
  currentQuestionIndex = (currentQuestionIndex + 1) % quizData.length;
  renderCurrentQuestion(currentQuestionIndex);
  quizForm.reset();

  if (feedbackEl) {
    feedbackEl.textContent = `Перейшли до питання ${currentQuestionIndex + 1}. Оберіть варіант відповіді.`;
  }
});

// Функція для обробки даних циклом та умовної класифікації (з практикуму 6)
function processQuiz(questions, userAnswer) {
  let correctAnswersCount = 0;

  for (const item of questions) {
    if (userAnswer === item.answer) {
      correctAnswersCount++;
    }
  }

  return correctAnswersCount;
}

const totalCorrect = processQuiz(quizData, "let");
const calcScorePercent = (correctCount, total) => Math.round((correctCount / total) * 100);
const finalPercent = calcScorePercent(totalCorrect, quizData.length);
console.log(`Тестовий підсумок за "let": ${totalCorrect} з ${quizData.length} (${finalPercent}%)`);