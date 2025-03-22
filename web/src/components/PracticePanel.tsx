import { useState } from "react";
import { Flashcard } from "../types";

type PracticePanelProps = {
  // Add any props if needed
};

const PracticePanel: React.FC<PracticePanelProps> = () => {
  const [savedFlashcards, setSavedFlashcards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem("savedFlashcards");
    return saved ? JSON.parse(saved) : [];
  });

  const [mode, setMode] = useState("quiz");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [scores, setScores] = useState({ correct: 0, incorrect: 0 });
  const [difficulty, setDifficulty] = useState("medium");
  const [animation, setAnimation] = useState("");

  const resetQuiz = () => {
    // Shuffle the cards
    const shuffled = [...savedFlashcards].sort(() => Math.random() - 0.5);
    setSavedFlashcards(shuffled);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setQuizCompleted(false);
    setScores({ correct: 0, incorrect: 0 });
    setAnimation("");
  };

  const nextCard = () => {
    if (currentCardIndex < savedFlashcards.length - 1) {
      setAnimation("slide-out");
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 1);
        setShowAnswer(false);
        setAnimation("slide-in");
      }, 300);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleDifficultyResponse = (isCorrect: boolean) => {
    setScores((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      incorrect: isCorrect ? prev.incorrect : prev.incorrect + 1,
    }));
    nextCard();
  };

  if (savedFlashcards.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          No Flashcards to Practice
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Save some flashcards from the dictionary to start practicing with
          them.
        </p>
        <button
          onClick={() => {
            // Navigate to search tab
            const searchTabButton = document.querySelector(
              'button[onClick="() => setActiveTab(\\"search\\")"]'
            ) as HTMLButtonElement | null;
            if (searchTabButton) searchTabButton.click();
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Start Searching Words
        </button>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Practice Completed!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You completed {savedFlashcards.length} flashcards
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
              {scores.correct}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Correct
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">
              {scores.incorrect}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Incorrect
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
              {Math.round((scores.correct / savedFlashcards.length) * 100)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Accuracy
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={resetQuiz}
            className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Restart Practice
          </button>
          <button
            onClick={() => {
              const historyTabButton = document.querySelector(
                'button[onClick="() => setActiveTab(\\"history\\")"]'
              ) as HTMLButtonElement | null;
              if (historyTabButton) historyTabButton.click();
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            View All Flashcards
          </button>
        </div>
      </div>
    );
  }

  const currentCard = savedFlashcards[currentCardIndex];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Practice Mode
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Card {currentCardIndex + 1} of {savedFlashcards.length}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            onClick={resetQuiz}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md px-3 py-1 text-sm font-medium transition-colors"
          >
            Shuffle
          </button>
        </div>
      </div>

      <div className="mb-6 bg-gray-100 dark:bg-gray-800/50 h-2 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 dark:bg-blue-600 h-full transition-all duration-300 ease-out"
          style={{
            width: `${(currentCardIndex / savedFlashcards.length) * 100}%`,
          }}
        />
      </div>

      <div
        className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${
          animation === "slide-out"
            ? "animate-slide-out"
            : animation === "slide-in"
            ? "animate-slide-in"
            : ""
        }`}
        style={{
          minHeight: "16rem",
          perspective: "1000px",
        }}
      >
        <div
          className={`w-full h-full transition-transform duration-500 p-6 ${
            showAnswer ? "rotate-y-180" : ""
          }`}
          style={{
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Front of card */}
          <div
            className={`absolute inset-0 flex flex-col justify-center items-center p-6 ${
              showAnswer ? "hidden" : ""
            }`}
          >
            <div className="text-sm text-blue-500 dark:text-blue-400 font-medium mb-2">
              {currentCard.word}
            </div>
            <div className="text-xl font-medium text-gray-800 dark:text-gray-200 text-center mb-8">
              {currentCard.front}
            </div>
            <button
              onClick={() => setShowAnswer(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg px-6 py-2 text-sm font-medium transition-colors"
            >
              Show Answer
            </button>
          </div>

          {/* Back of card */}
          <div
            className={`absolute inset-0 flex flex-col justify-center items-center p-6 ${
              !showAnswer ? "hidden" : ""
            }`}
            style={{
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="text-sm text-blue-500 dark:text-blue-400 font-medium mb-2">
              {currentCard.word}
            </div>
            <div className="text-xl font-medium text-gray-800 dark:text-gray-200 text-center mb-8">
              {currentCard.back}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleDifficultyResponse(false)}
                className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-800/40 dark:text-red-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Didn't Know
              </button>
              <button
                onClick={() => handleDifficultyResponse(true)}
                className="bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Got It Right
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticePanel;
