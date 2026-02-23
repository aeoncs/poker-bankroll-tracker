import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BankrollProvider } from "./context/BankrollContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <BankrollProvider>
          <App />
        </BankrollProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);