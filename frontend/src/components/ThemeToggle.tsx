import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement;
    
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.style.setProperty("--background", "222.2 84% 4.9%");
      root.style.setProperty("--foreground", "210 40% 98%");
      root.style.setProperty("--card", "222.2 84% 4.9%");
      root.style.setProperty("--card-foreground", "210 40% 98%");
      root.style.setProperty("--popover", "222.2 84% 4.9%");
      root.style.setProperty("--popover-foreground", "210 40% 98%");
      root.style.setProperty("--primary", "217.2 91.2% 59.8%");
      root.style.setProperty("--primary-foreground", "222.2 47.4% 11.2%");
      root.style.setProperty("--secondary", "217.2 32.6% 17.5%");
      root.style.setProperty("--secondary-foreground", "210 40% 98%");
      root.style.setProperty("--muted", "217.2 32.6% 17.5%");
      root.style.setProperty("--muted-foreground", "215 20.2% 65.1%");
      root.style.setProperty("--accent", "217.2 32.6% 17.5%");
      root.style.setProperty("--accent-foreground", "210 40% 98%");
      root.style.setProperty("--border", "217.2 32.6% 17.5%");
      root.style.setProperty("--input", "217.2 32.6% 17.5%");
      root.style.setProperty("--ring", "224.3 76.3% 48%");
    } else {
      root.classList.remove("dark");
      root.style.setProperty("--background", "0 0% 100%");
      root.style.setProperty("--foreground", "222.2 84% 4.9%");
      root.style.setProperty("--card", "0 0% 100%");
      root.style.setProperty("--card-foreground", "222.2 84% 4.9%");
      root.style.setProperty("--popover", "0 0% 100%");
      root.style.setProperty("--popover-foreground", "222.2 84% 4.9%");
      root.style.setProperty("--primary", "221.2 83.2% 53.3%");
      root.style.setProperty("--primary-foreground", "210 40% 98%");
      root.style.setProperty("--secondary", "210 40% 96.1%");
      root.style.setProperty("--secondary-foreground", "222.2 47.4% 11.2%");
      root.style.setProperty("--muted", "210 40% 96.1%");
      root.style.setProperty("--muted-foreground", "215.4 16.3% 46.9%");
      root.style.setProperty("--accent", "210 40% 96.1%");
      root.style.setProperty("--accent-foreground", "222.2 47.4% 11.2%");
      root.style.setProperty("--border", "214.3 31.8% 91.4%");
      root.style.setProperty("--input", "214.3 31.8% 91.4%");
      root.style.setProperty("--ring", "221.2 83.2% 53.3%");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-14 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out group overflow-hidden"
      aria-label="Toggle theme"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 dark:from-purple-700 dark:to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Toggle circle */}
      <div
        className={`absolute w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-md transform transition-all duration-300 ease-in-out flex items-center justify-center ${
          theme === "dark" ? "translate-x-3" : "-translate-x-3"
        }`}
      >
        {theme === "light" ? (
          <Sun className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
        )}
      </div>
      
      {/* Icons in background */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Sun className={`w-3 h-3 text-white transition-opacity duration-300 ${theme === "light" ? "opacity-0" : "opacity-70"}`} />
        <Moon className={`w-3 h-3 text-white transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-70"}`} />
      </div>
    </button>
  );
}
