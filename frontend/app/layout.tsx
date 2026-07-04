import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "IndieBoost — AI Growth Agents for Indie Hackers",
  description: "Get your first users using AI-powered growth agents. SEO, Reddit, Twitter, Newsletter — all on a $5+ budget.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="py-6 text-center text-sm text-gray-500 border-t border-gray-200">
            IndieBoost — AI-Powered Growth for Indie Hackers
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
