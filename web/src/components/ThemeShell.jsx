"use client";

import { useAuth } from "../context/AuthContext";


export default function ThemeShell({ children }) {
  const { user } = useAuth();
  const theme = user?.theme === "light" ? "light" : "dark";

 
  const shellClass = theme === "light" ? "shellLight" : "shellDark";

  return <div className={shellClass}>{children}</div>;
}