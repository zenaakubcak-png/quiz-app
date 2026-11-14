// Обрано Vue 3 через CDN, оскільки він підключається одним тегом без збірки/Babel, має зручну реактивність та наочне дерево стану у Vue DevTools.

const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';

/*
  Функцію ручного рендеру списку renderQuestions(questions) з практикуму 7 замінено
  на декларативний рендер у Vue 3 через директиву v-for та компонент QuizQuestion
  (без ручного виклику createElement, querySelector чи innerHTML для списку).
*/

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
      currentIndex: 0,
      score: 0,
      feedback: 'Оберіть варіант відповіді, клікнувши по ньому.',
      isLoading: false,
      errorMessage: ''
    };
  },
  computed: {
    currentQuestion() {
      return this.questions[this.currentIndex] || null;
    },
    progressPercent() {
      if (!this.questions.length) return 0;
      return Math.round(((this.currentIndex + 1) / this.questions.length) * 100);
    }
  },
  methods: {
    handleAnswer(selectedIndex) {
      const current = this.currentQuestion;
      if (!current) return;

      const isCorrect = selectedIndex === current.correctIndex;
      if (!current.answered && isCorrect) {
        this.score += 1;
      }
      current.answered = true;

      this.feedback = isCorrect
        ? `Правильно! Відповідь «${current.options[selectedIndex]}» зараховано (рахунок: ${this.score}/${this.questions.length}).`
        : `Неправильно. Ви обрали «${current.options[selectedIndex]}», правильна відповідь: «${current.answer}» (рахунок: ${this.score}/${this.questions.length}).`;
    },
    nextQuestion() {
      if (!this.questions.length) return;
      this.currentIndex = (this.currentIndex + 1) % this.questions.length;
      this.feedback = `Перейшли до питання ${this.currentIndex + 1}. Оберіть варіант відповіді.`;
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
      } catch (error) {
        console.error('Помилка завантаження даних з Open Trivia Database:', error);
        this.errorMessage = 'Не вдалося завантажити питання з сервісу вікторини. Перевірте з’єднання з інтернетом і натисніть «Оновити».';
      } finally {
        this.isLoading = false;
      }
    }
  },
  mounted() {
    this.loadQuestionsFromApi();
  }
}).mount('#app');