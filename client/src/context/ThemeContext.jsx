import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const ThemeContext = createContext(null);
const KEY = "appTheme"; // "dark" | "light"

export function ThemeProvider({ children }) {
  const { user } = useAuth();

  const [theme, setTheme] = useState(() => localStorage.getItem(KEY) || "dark");

  // If user loads and has a theme preference, apply it (but only if they haven't already selected a theme, which we check by looking for an existing value in localStorage)
  
  useEffect(() => {
    if (!user?.theme) return;
    const stored = localStorage.getItem(KEY);
    // If nothing stored yet, use user's preference
    if (!stored) {
      localStorage.setItem(KEY, user.theme);
      setTheme(user.theme);
    }
  }, [user]);

  function setAndPersist(next) {
    setTheme(next);
    localStorage.setItem(KEY, next);
  }

  const value = useMemo(
    () => ({
      theme,
      setTheme: setAndPersist,
      toggleTheme: () => setAndPersist(theme === "dark" ? "light" : "dark"),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}