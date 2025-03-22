import { useState, useEffect } from "react";

export default function Redefine() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                redefine
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Discover words in an elegant way.
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {darkMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="mb-6">
            <nav className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("search")}
                className={`py-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === "search"
                    ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Dictionary
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                History & Flashcards
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`py-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === "settings"
                    ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setActiveTab("practice")}
                className={`py-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === "practice"
                    ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Practice
              </button>
            </nav>
          </div>

          {activeTab === "search" && <SearchBar />}
          {activeTab === "history" && <HistoryPanel />}
          {activeTab === "settings" && <SettingsPanel />}
          {activeTab === "practice" && <PracticePanel />}
        </div>
      </div>
    </div>
  );
}

function SearchBar() {
  // Dictionary data with LLM-style definitions
  const dictionary = {
    aplomb: {
      word: "aplomb",
      phonetic: "/əˈplɒm/",
      partOfSpeech: "noun",
      definition:
        "Aplomb is the confident, graceful poise you show in challenging situations. It's like a chef who doesn't panic when something catches fire in the kitchen, a public speaker who remains collected when the microphone stops working, or a dancer who recovers seamlessly from a minor stumble. Having aplomb means you handle pressure with ease and self-assurance.",
      example:
        "She handled the difficult interview questions with aplomb, impressing all the panel members.",
      synonyms: ["poise", "confidence", "self-assurance", "composure", "grace"],
      flashcards: [
        {
          front:
            "What quality helps you stay calm when giving a speech to a large audience?",
          back: "Aplomb",
        },
        {
          front: "Aplomb",
          back: "Self-confident poise, especially in challenging situations",
        },
        {
          front:
            "When a crisis happens at work and your manager handles it calmly and confidently, she is demonstrating...",
          back: "Aplomb",
        },
      ],
    },
    apple: {
      word: "apple",
      phonetic: "/ˈæp.əl/",
      partOfSpeech: "noun",
      definition:
        "An apple is a common round fruit with a red, green, or yellow skin and crisp, juicy flesh. Beyond being a healthy snack, apples are deeply embedded in our culture - from the 'apple of my eye' idiom describing someone precious to you, to the iconic Apple technology company, to the legendary story of Newton discovering gravity when an apple fell on his head. Apples symbolize knowledge, temptation, and simplicity.",
      example:
        "She packed an apple in her lunch every day for its convenience and nutritional benefits.",
      synonyms: ["fruit", "produce", "orchard fruit", "pomaceous fruit"],
      flashcards: [
        {
          front:
            "What fruit is associated with gravity in the story of Newton?",
          back: "Apple",
        },
        {
          front: "Apple",
          back: "A round fruit with red, green, or yellow skin and crisp flesh",
        },
        {
          front: "What fruit is used in the idiom 'apple of my eye'?",
          back: "Apple",
        },
      ],
    },
    apache: {
      word: "apache",
      phonetic: "/əˈpæʃ/",
      partOfSpeech: "noun",
      definition:
        "Apache refers to a group of culturally related Native American tribes originally from the Southwestern United States. The name is also used for their languages and has been adopted for various modern contexts - most notably the Apache web server software that powers a large portion of websites, and the Apache helicopter, a formidable attack aircraft. The Apache people are known for their resilience, adaptability, and rich cultural traditions.",
      example:
        "The Apache tribes developed sophisticated survival techniques adapted to the harsh desert environment.",
      synonyms: ["tribe", "people", "nation", "indigenous group"],
      flashcards: [
        {
          front:
            "Which Native American people are known for their resilience and are also the namesake of a popular web server?",
          back: "Apache",
        },
        {
          front: "Apache",
          back: "A group of Native American tribes from the Southwestern US",
        },
        {
          front:
            "What popular web server shares its name with a Native American tribe?",
          back: "Apache",
        },
      ],
    },
    apprentice: {
      word: "apprentice",
      phonetic: "/əˈprentɪs/",
      partOfSpeech: "noun",
      definition:
        "An apprentice is someone who's learning a craft, trade, or profession from an experienced mentor. Unlike modern students who primarily learn through books and lectures, apprentices learn by doing - working alongside masters of their field. This hands-on approach appears in many contexts: a young chef learning under a renowned restaurateur, a carpenter's assistant developing woodworking skills, or even in corporate 'apprenticeship programs' where new employees receive mentorship and training.",
      example:
        "As an apprentice to the master carpenter, she learned techniques that couldn't be taught in any classroom.",
      synonyms: ["trainee", "learner", "student", "novice", "mentee"],
      flashcards: [
        {
          front:
            "What do you call someone learning a trade directly from an experienced mentor?",
          back: "Apprentice",
        },
        {
          front: "Apprentice",
          back: "A person learning a trade or skill by working under a master of that field",
        },
        {
          front: "In medieval guilds, what was the position below journeyman?",
          back: "Apprentice",
        },
      ],
    },
    appropriate: {
      word: "appropriate",
      phonetic: "/əˈproʊpriət/",
      partOfSpeech: "adjective",
      definition:
        "Something appropriate fits well with a particular situation or context. It's about what's suitable, proper, or fitting for specific circumstances. Appropriate attire for a beach differs from appropriate behavior in a library. The concept shifts across cultures, generations, and settings - what's appropriate in casual settings may be inappropriate in formal ones. Having a good sense of what's appropriate shows social awareness and respect for different contexts.",
      example:
        "Wearing formal business attire would be entirely appropriate for the interview, but might be inappropriate for the company's casual Friday policy.",
      synonyms: ["suitable", "proper", "fitting", "apt", "relevant", "correct"],
      flashcards: [
        {
          front:
            "What quality describes behavior that fits well with social expectations in a given context?",
          back: "Appropriate",
        },
        {
          front: "Appropriate",
          back: "Suitable or proper for a particular situation or context",
        },
        {
          front:
            "When choosing an outfit for a job interview, you should select something...",
          back: "Appropriate",
        },
      ],
    },
  };

  const LLM_MODELS = [
    { id: "claude-3-sonnet", name: "Claude 3 Sonnet" },
    { id: "claude-3-opus", name: "Claude 3 Opus" },
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ];

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [wordData, setWordData] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [savedFlashcards, setSavedFlashcards] = useState(() => {
    const saved = localStorage.getItem("savedFlashcards");
    return saved ? JSON.parse(saved) : [];
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    const history = localStorage.getItem("searchHistory");
    return history ? JSON.parse(history) : [];
  });

  useEffect(() => {
    localStorage.setItem("savedFlashcards", JSON.stringify(savedFlashcards));
  }, [savedFlashcards]);

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setWordData(null);
    setStreamedText("");

    // Generate suggestions based on input
    const filteredSuggestions = value
      ? Object.keys(dictionary).filter((word) =>
          word.toLowerCase().includes(value.toLowerCase())
        )
      : [];

    setSuggestions(filteredSuggestions);
    setSelectedIndex(null);
  };

  const handleSearch = (searchQuery) => {
    if (!searchQuery) return;

    setQuery(searchQuery);
    setSuggestions([]);
    setSelectedIndex(null);

    // Get word data from dictionary
    const data = dictionary[searchQuery.toLowerCase()];

    if (data) {
      setWordData(data);
      // Start streaming the definition
      streamDefinition(data.definition);

      // Add to search history if not already the most recent
      setSearchHistory((prev) => {
        const filteredHistory = prev.filter((item) => item.word !== data.word);
        return [
          { word: data.word, timestamp: new Date().toISOString() },
          ...filteredHistory,
        ].slice(0, 100);
      });
    } else {
      setWordData({
        word: searchQuery,
        error: true,
      });
      setStreamedText("");
    }
  };

  const streamDefinition = (text) => {
    setIsStreaming(true);
    setStreamedText("");

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setStreamedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 15); // Faster streaming speed
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (selectedIndex !== null && suggestions[selectedIndex]) {
        handleSearch(suggestions[selectedIndex]);
      } else {
        handleSearch(query);
      }
    } else if (e.key === "ArrowDown") {
      setSelectedIndex((prevIndex) =>
        prevIndex === null || prevIndex === suggestions.length - 1
          ? 0
          : prevIndex + 1
      );
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prevIndex) =>
        prevIndex === null || prevIndex === 0
          ? suggestions.length - 1
          : prevIndex - 1
      );
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSearch(suggestion);
  };

  const toggleFlashcard = (flashcard) => {
    const isAlreadySaved = savedFlashcards.some(
      (saved) =>
        saved.front === flashcard.front && saved.back === flashcard.back
    );

    if (isAlreadySaved) {
      setSavedFlashcards(
        savedFlashcards.filter(
          (saved) =>
            !(saved.front === flashcard.front && saved.back === flashcard.back)
        )
      );
    } else {
      setSavedFlashcards([
        ...savedFlashcards,
        {
          ...flashcard,
          word: wordData.word,
          savedAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const isFlashcardSaved = (flashcard) => {
    return savedFlashcards.some(
      (saved) =>
        saved.front === flashcard.front && saved.back === flashcard.back
    );
  };

  return (
    <div className="flex flex-col">
      <div className="relative mb-6">
        <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400">
          <input
            type="text"
            placeholder="Search for a word..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="w-full bg-white dark:bg-gray-800 px-4 py-3 text-gray-700 dark:text-gray-200 focus:outline-none"
            autoComplete="off"
          />
          <button
            onClick={() => handleSearch(query)}
            className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 px-4 transition duration-150 flex items-center justify-center"
            aria-label="Search"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                  selectedIndex === index ? "bg-gray-100 dark:bg-gray-700" : ""
                } text-gray-700 dark:text-gray-200`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>

      {wordData && (
        <div
          className={`border-t border-gray-200 dark:border-gray-700 pt-6 transition-opacity duration-300 ${
            wordData ? "opacity-100" : "opacity-0"
          }`}
        >
          {wordData.error ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
              We couldn't find "{wordData.word}" in our dictionary. Please try
              another word.
            </div>
          ) : (
            <>
              <div className="flex items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {wordData.word}
                </h2>
                <span className="ml-3 text-gray-500 dark:text-gray-400 text-sm font-normal italic">
                  {wordData.phonetic}
                </span>
                <button
                  className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Pronounce word"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                </button>
              </div>

              <div className="text-sm text-blue-500 dark:text-blue-400 font-semibold uppercase tracking-wide mb-3">
                {wordData.partOfSpeech}
              </div>

              <div className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 min-h-24">
                {streamedText}
                {isStreaming && <span className="animate-pulse">|</span>}
              </div>

              {wordData.example && (
                <div className="text-gray-600 dark:text-gray-400 italic mb-6 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                  {wordData.example}
                </div>
              )}

              {wordData.synonyms && wordData.synonyms.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Synonyms:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {wordData.synonyms.map((synonym, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSearch(synonym)}
                      >
                        {synonym}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {wordData.flashcards && wordData.flashcards.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    Anki Flashcards
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Select cards to save for your study sessions:
                  </p>

                  <div className="grid gap-3">
                    {wordData.flashcards.map((flashcard, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                          isFlashcardSaved(flashcard)
                            ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => toggleFlashcard(flashcard)}
                      >
                        <div className="flex items-center p-4">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                              {flashcard.front}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 text-sm">
                              {flashcard.back}
                            </div>
                          </div>
                          <div
                            className={`ml-3 ${
                              isFlashcardSaved(flashcard)
                                ? "text-blue-500 dark:text-blue-400"
                                : "text-gray-400 dark:text-gray-600"
                            }`}
                          >
                            {isFlashcardSaved(flashcard) ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryPanel() {
  const [searchHistory, setSearchHistory] = useState(() => {
    const history = localStorage.getItem("searchHistory");
    return history ? JSON.parse(history) : [];
  });

  const [savedFlashcards, setSavedFlashcards] = useState(() => {
    const saved = localStorage.getItem("savedFlashcards");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState("history");
  const [selectedFlashcards, setSelectedFlashcards] = useState([]);

  const clearHistory = () => {
    const userConfirmed = window.confirm(
      "Are you sure you want to clear your search history?"
    );
    if (userConfirmed) {
      setSearchHistory([]);
      localStorage.setItem("searchHistory", JSON.stringify([]));
    }
  };

  const removeFlashcard = (index) => {
    const newFlashcards = [...savedFlashcards];
    newFlashcards.splice(index, 1);
    setSavedFlashcards(newFlashcards);
    localStorage.setItem("savedFlashcards", JSON.stringify(newFlashcards));
  };

  const toggleSelectFlashcard = (index) => {
    if (selectedFlashcards.includes(index)) {
      setSelectedFlashcards(selectedFlashcards.filter((i) => i !== index));
    } else {
      setSelectedFlashcards([...selectedFlashcards, index]);
    }
  };

  const exportSelectedFlashcards = () => {
    if (selectedFlashcards.length === 0) {
      alert("Please select at least one flashcard to export");
      return;
    }

    const flashcardsToExport = selectedFlashcards.map(
      (index) => savedFlashcards[index]
    );

    // Format for Anki export (simplified version)
    const ankiFormat = flashcardsToExport
      .map((card) => `${card.front}\t${card.back}`)
      .join("\n");

    // Create a download link
    const element = document.createElement("a");
    const file = new Blob([ankiFormat], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "redefine_flashcards.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setSelectedFlashcards([]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setActiveTab("history")}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Search History
        </button>
        <button
          onClick={() => setActiveTab("flashcards")}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "flashcards"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Saved Flashcards
        </button>
      </div>

      {activeTab === "history" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Your Search History
            </h3>
            {searchHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {searchHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>Your search history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchHistory.map((item, index) => (
                <div key={index} className="py-3 flex items-center">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {item.word}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(item.timestamp)}
                    </div>
                  </div>
                  <button
                    className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    onClick={() => {
                      // Navigate to search tab and search for this word
                      document
                        .querySelector('button[aria-label="Dictionary"]')
                        ?.click();
                      setTimeout(() => {
                        const searchBar = document.querySelector(
                          'input[placeholder="Search for a word..."]'
                        );
                        if (searchBar) {
                          searchBar.value = item.word;
                          searchBar.dispatchEvent(
                            new Event("change", { bubbles: true })
                          );
                          document
                            .querySelector('button[aria-label="Search"]')
                            ?.click();
                        }
                      }, 100);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "flashcards" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Your Saved Flashcards ({savedFlashcards.length})
            </h3>
            {selectedFlashcards.length > 0 && (
              <div className="flex space-x-3">
                <button
                  onClick={exportSelectedFlashcards}
                  className="text-sm text-blue-500 dark:text-blue-400 font-medium hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                >
                  Export Selected ({selectedFlashcards.length})
                </button>
                <button
                  onClick={() => setSelectedFlashcards([])}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {savedFlashcards.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600"
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
              <p>You haven't saved any flashcards yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedFlashcards.map((card, index) => (
                <div
                  key={index}
                  className={`border rounded-lg overflow-hidden ${
                    selectedFlashcards.includes(index)
                      ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex p-4">
                    <div className="flex items-center pr-4">
                      <input
                        type="checkbox"
                        checked={selectedFlashcards.includes(index)}
                        onChange={() => toggleSelectFlashcard(index)}
                        className="h-4 w-4 text-blue-500 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded px-2 py-0.5 mr-2">
                          {card.word}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Saved {formatDate(card.savedAt)}
                        </div>
                      </div>
                      <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        {card.front}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {card.back}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFlashcard(index)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 ml-2 p-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {savedFlashcards.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => exportSelectedFlashcards(savedFlashcards)}
                className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Export All to Anki
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsPanel() {
  const [promptTemplate, setPromptTemplate] = useState(() => {
    const saved = localStorage.getItem("promptTemplate");
    return (
      saved ||
      `Provide a comprehensive definition for the word "{word}" that includes:
1. Its meaning in plain, accessible language
2. Contextual examples of how it's used
3. Cultural or historical significance if relevant
4. Common phrases or idioms it appears in
5. Connections to related concepts

Keep the tone conversational but informative, as if explaining to a curious friend. Avoid overly academic language but don't oversimplify.`
    );
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("selectedModel");
    return saved || "claude-3-sonnet";
  });

  const [testWord, setTestWord] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDefinition, setGeneratedDefinition] = useState("");

  const LLM_MODELS = [
    { id: "claude-3-sonnet", name: "Claude 3 Sonnet" },
    { id: "claude-3-opus", name: "Claude 3 Opus" },
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ];

  useEffect(() => {
    localStorage.setItem("promptTemplate", promptTemplate);
  }, [promptTemplate]);

  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  const testPrompt = () => {
    if (!testWord.trim()) {
      alert("Please enter a word to test");
      return;
    }

    setIsGenerating(true);
    const finalPrompt = promptTemplate.replace("{word}", testWord);

    // Simulate API call with streaming response
    let generatedText =
      "An apple is a common round fruit with a red, green, or yellow skin and crisp, juicy flesh. Beyond being a healthy snack, apples are deeply embedded in our culture - from the 'apple of my eye' idiom describing someone precious to you, to the iconic Apple technology company, to the legendary story of Newton discovering gravity when an apple fell on his head. Apples symbolize knowledge, temptation, and simplicity in various contexts.\n\nPeople eat apples raw, baked into pies, pressed into cider, or cooked into sauce. The phrase 'an apple a day keeps the doctor away' highlights its reputation for healthfulness. In literature and mythology, apples appear in stories from Snow White to the Garden of Eden.\n\nThe versatility of apples extends to phrases like 'apple of discord' (something causing trouble), 'comparing apples and oranges' (comparing unlike things), and 'upsetting the apple cart' (disturbing established order).";

    if (testWord.toLowerCase() !== "apple") {
      generatedText =
        "Generating definition for '" +
        testWord +
        "' using " +
        selectedModel +
        "...\n\nThis would typically call an actual LLM API with your custom prompt template, but we're showing a simulation for demonstration purposes.\n\nYour prompt template would be applied to the word '" +
        testWord +
        "' and sent to the selected model for processing.";
    }

    setGeneratedDefinition("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < generatedText.length) {
        setGeneratedDefinition((prev) => prev + generatedText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsGenerating(false);
      }
    }, 10);
  };

  const resetToDefault = () => {
    if (window.confirm("Reset to default prompt template?")) {
      setPromptTemplate(`Provide a comprehensive definition for the word "{word}" that includes:
1. Its meaning in plain, accessible language
2. Contextual examples of how it's used
3. Cultural or historical significance if relevant
4. Common phrases or idioms it appears in
5. Connections to related concepts

Keep the tone conversational but informative, as if explaining to a curious friend. Avoid overly academic language but don't oversimplify.`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Definition Generation Settings
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Customize how definitions are generated by editing the prompt template
          and selecting your preferred AI model.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Language Model
          </label>
          <select
            value={selectedModel}
            onChange={handleModelChange}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {LLM_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Prompt Template
            </label>
            <button
              onClick={resetToDefault}
              className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
            >
              Reset to Default
            </button>
          </div>
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-40"
            placeholder="Enter your prompt template here. Use {word} as a placeholder for the searched word."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Use{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-blue-500 dark:text-blue-400">
              {"{word}"}
            </code>{" "}
            as a placeholder for the search term.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Test Your Prompt
          </h4>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={testWord}
              onChange={(e) => setTestWord(e.target.value)}
              placeholder="Enter a word to test"
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <button
              onClick={testPrompt}
              disabled={isGenerating}
              className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "Test"}
            </button>
          </div>

          {generatedDefinition && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 max-h-60 overflow-y-auto">
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                {generatedDefinition}
                {isGenerating && <span className="animate-pulse">|</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Display Settings
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Enable streaming text effect
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="toggleStreaming"
                className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
                defaultChecked={true}
              />
              <label
                htmlFor="toggleStreaming"
                className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Auto-save flashcards
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="toggleAutoSave"
                className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
              />
              <label
                htmlFor="toggleAutoSave"
                className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Show pronunciation guide
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="togglePronunciation"
                className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
                defaultChecked={true}
              />
              <label
                htmlFor="togglePronunciation"
                className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          App Information
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Redefine
            </span>{" "}
            - Version 1.2.0
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Created with ❤️ for elegant word learning
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticePanel() {
  const [savedFlashcards, setSavedFlashcards] = useState(() => {
    const saved = localStorage.getItem("savedFlashcards");
    return saved ? JSON.parse(saved) : [];
  });

  const [mode, setMode] = useState("quiz"); // quiz or review
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

  const handleDifficultyResponse = (isCorrect) => {
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
            document.querySelector('button[aria-label="Dictionary"]')?.click();
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
              document
                .querySelector('button[aria-label="History & Flashcards"]')
                ?.click();
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
}
