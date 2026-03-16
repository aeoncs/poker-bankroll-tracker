import type { Metadata, Viewport } from "next";
import { AuthProvider } from "../context/AuthContext";
import ThemeShell from "../components/ThemeShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Bankroll Tracker",
  description: "Poker bankroll tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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