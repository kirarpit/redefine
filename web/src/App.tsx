import { useState } from "react";

function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [definition, setDefinition] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setDefinition(null);
    setSuggestions(
      value
        ? ["aplomb", "apple", "apache", "apprentice", "appropriate"].filter(
            (s) => s.includes(value)
          )
        : []
    );
    setSelectedIndex(null);
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery) return;
    setQuery(searchQuery);
    setSuggestions([]);
    setDefinition(`Definition of ${searchQuery}`);
    setSelectedIndex(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion);
  };

  return (
    <div className="flex h-screen flex-col items-center bg-gray-50 dark:bg-gray-800 pt-56 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-gray-700 p-4 shadow-sm">
        <div className="flex overflow-hidden rounded-md bg-gray-200 dark:bg-gray-600 focus-within:outline focus-within:outline-blue-500">
          <input
            type="text"
            placeholder="Define..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="w-full rounded-bl-md rounded-tl-md bg-gray-100 dark:bg-gray-600 px-4 py-2.5 text-gray-700 dark:text-gray-200 focus:outline-none"
          />
          <button
            onClick={() => handleSearch(query)}
            className="bg-blue-500 px-3.5 text-white duration-150 hover:bg-blue-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6"
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
          <ul className="mt-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer ${
                  selectedIndex === index ? "bg-gray-200 dark:bg-gray-600" : ""
                } text-gray-700 dark:text-gray-200`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
        {definition && (
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            {definition}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyApp() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const toggleDarkMode = () => {
    setDarkMode((prevMode: boolean) => {
      const newMode = !prevMode;
      localStorage.setItem("darkMode", JSON.stringify(newMode));
      return newMode;
    });
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
        <div className="flex justify-end items-center p-4">
          <button
            onClick={toggleDarkMode}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md"
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
        <SearchBar />
      </div>
    </div>
  );
}
