// Перевірка підключення
// Виводимо повідомлення, щоб переконатися, що файл успішно підключено до HTML
console.log('script.js підключено');

// Оголошення даних свого варіанта
// Створюємо масив об'єктів з питаннями вікторини та правильними відповідями
const quizData = [
  { question: "Яке ключове слово використовується для оголошення змінної в JavaScript?", answer: "let" },
  { question: "Який тип даних використовується для тексту?", answer: "string" },
  { question: "Який результат typeof 5?", answer: "number" },
  { question: "Чи мають стрілкові функції власний this?", answer: "ні" }
];

// Жорстко задана відповідь користувача для тестування 
const testUserAnswer = "let"; 

// Функція для обробки даних циклом та умовної класифікації
// Ця функція перебирає масив питань (for...of), порівнює задану відповідь (if/else) і підраховує бали
function processQuiz(questions, userAnswer) {
  let correctAnswersCount = 0; // лічильник правильних відповідей

  for (const item of questions) {
    console.log(`Питання: ${item.question}`);
    console.log(`Відповідь користувача: ${userAnswer} | Правильна відповідь: ${item.answer}`);
    
    // умовна конструкція (if/else) жорстко порівнює відповіді
    if (userAnswer === item.answer) {
      console.log('Результат: правильно');
      correctAnswersCount++;
    } else {
      console.log('Результат: неправильно');
    }
    console.log('---------------------------');
  }

  return correctAnswersCount; // повертаємо підсумкову кількість правильних відповідей
}

// Викликаємо функцію обробки масиву
const totalCorrect = processQuiz(quizData, testUserAnswer);
console.log(`Загальна кількість правильних відповідей: ${totalCorrect} з ${quizData.length}`);

// Стрілкова функція
// Стрілкова функція, яка приймає кількість правильних відповідей і загальну кількість, 
// та повертає відсоток успішності округлений до цілого
const calcScorePercent = (correctCount, total) => Math.round(correctCount / total * 100);

// Викликаємо стрілкову функцію з реальними обчисленими даними
const finalPercent = calcScorePercent(totalCorrect, quizData.length);
console.log(`Твій фінальний результат: ${finalPercent}%`);