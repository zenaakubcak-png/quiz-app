const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Локальні дані для Варіанта 8: набір питань (заміна Open Trivia Database)
const localQuestions = [
    // Крок 15: тестове питання для перевірки XSS (видалити після скріншотів)
  {
    question: '&lt;img src=x onerror=&quot;alert(\'XSS\')&quot;&gt; Тестове питання',
    correct_answer: 'Так',
    incorrect_answers: ['Ні', 'Не знаю']
  },
  {
    category: "Science: Computers",
    type: "multiple",
    difficulty: "easy",
    question: "Що означає CPU?",
    correct_answer: "Central Processing Unit",
    incorrect_answers: ["Central Process Unit", "Computer Personal Unit", "Central Processor Unit"]
  },
  {
    category: "Science: Computers",
    type: "multiple",
    difficulty: "easy",
    question: "Яка мова програмування найчастіше використовується для веб-розробки (фронтенд)?",
    correct_answer: "JavaScript",
    incorrect_answers: ["Python", "C++", "Java"]
  },
  {
    category: "Science: Computers",
    type: "multiple",
    difficulty: "easy",
    question: "Як розшифровується HTML?",
    correct_answer: "Hypertext Markup Language",
    incorrect_answers: ["Hypertext Markdown Language", "Hyperloop Machine Language", "Helicopters Terminals Motorboats Lamborghinis"]
  },
  {
    category: "Science: Computers",
    type: "multiple",
    difficulty: "easy",
    question: "Скільки байтів у кілобайті (за системою СІ)?",
    correct_answer: "1000",
    incorrect_answers: ["1024", "100", "1048"]
  },
  {
    category: "Science: Computers",
    type: "multiple",
    difficulty: "easy",
    question: "Який тег використовується для створення гіперпосилання в HTML?",
    correct_answer: "&lt;a&gt;",
    incorrect_answers: ["&lt;link&gt;", "&lt;href&gt;", "&lt;nav&gt;"]
  }
];

// Middleware для роздачі статичних файлів (з папки public)
// Завдяки цьому index.html, script.js та css/style.css будуть доступні клієнту
app.use(express.static(path.join(__dirname, 'public')));

// Ендпоінт для отримання всього списку питань (Крок 5)
app.get('/api/questions', (req, res) => {
  // Для сумісності з клієнтським кодом (який чекає data.results),
  // загортаємо масив у об'єкт з властивістю results
  res.json({
    response_code: 0,
    results: localQuestions
  });
});

// Ендпоінт для перевірки обробки помилок (Крок 10)
// Наприклад, спроба отримати деталі неіснуючого питання
app.get('/api/questions/:id', (req, res) => {
  res.status(404).json({ error: 'Питання з таким ID не знайдено' });
});

app.use((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ error: 'Ендпоінт не знайдено' });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
  console.log(`API доступне за адресою: http://localhost:${PORT}/api/questions`);
});