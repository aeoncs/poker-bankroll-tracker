import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import ThemeShell from "../components/ThemeShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Bankroll Tracker",
  description: "Poker bankroll tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeShell>{children}</ThemeShell>
        </AuthProvider>
      </body>
    </html>
  );
}