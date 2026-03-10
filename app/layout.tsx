import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "../contexts/AppContext";

export const metadata: Metadata = {
  title: "ことばの おべんきょう",
  description: "たのしく ことばを おぼえよう！",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-amber-50 text-gray-800 min-h-screen">
        <AppProvider>
          <main className="max-w-lg mx-auto min-h-screen">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
