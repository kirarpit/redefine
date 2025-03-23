import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import HistoryPanel from "./HistoryPanel";
import SettingsPanel from "./SettingsPanel";

type TabType = "search" | "history" | "settings";

const DarkModeIcon: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  return darkMode ? (
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
  );
};

interface NavTabProps {
  id: TabType;
  label: string;
  activeTab: TabType;
  onClick: (tab: TabType) => void;
}

const NavTab: React.FC<NavTabProps> = ({ id, label, activeTab, onClick }) => {
  return (
    <button
      onClick={() => onClick(id)}
      className={`py-2 px-4 text-sm font-medium transition-colors ${
        activeTab === id
          ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
      aria-label={label}
    >
      {label}
    </button>
  );
};

const Redefine: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    console.log("Initializing darkMode state");
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      const parsedMode = JSON.parse(savedMode);
      console.log("Using saved dark mode for initial state:", parsedMode);
      return parsedMode;
    }
    console.log("No saved preference found, using default: false");
    return false;
  });

  const [activeTab, setActiveTab] = useState<TabType>("search");

  useEffect(() => {
    console.log("Dark mode useEffect triggered. Current value:", darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = (): void => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col pt-12 px-4">
      <div className="w-full max-w-4xl mx-auto">
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
              <DarkModeIcon darkMode={darkMode} />
            </button>
          </div>

          <div className="mb-6">
            <nav className="flex border-b border-gray-200 dark:border-gray-700">
              <NavTab
                id="search"
                label="Dictionary"
                activeTab={activeTab}
                onClick={setActiveTab}
              />
              <NavTab
                id="history"
                label="History & Flashcards"
                activeTab={activeTab}
                onClick={setActiveTab}
              />
              <NavTab
                id="settings"
                label="Settings"
                activeTab={activeTab}
                onClick={setActiveTab}
              />
            </nav>
          </div>

          {activeTab === "search" && <SearchBar />}
          {activeTab === "history" && <HistoryPanel />}
          {activeTab === "settings" && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
};

export default Redefine;
