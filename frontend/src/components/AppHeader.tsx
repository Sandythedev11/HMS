import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm py-3 px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground dark:text-gray-400">Welcome to your dashboard</span>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
} 