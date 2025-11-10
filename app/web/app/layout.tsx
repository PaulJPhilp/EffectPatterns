import type { Metadata } from "next";
import { Fira_Code, Merriweather, Montserrat } from "next/font/google";
import React from "react";
import { ThemeProvider } from "../components/theme-provider";
import { Footer } from "../components/ui/footer";
import { Header } from "../components/ui/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Effect Patterns Hub",
  description: "Learn Effect through curated roadmaps, interactive patterns, and AI-assisted learning",
};

const sans = Montserrat({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"], display: "swap" });
const serif = Merriweather({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "700"], display: "swap" });
const mono = Fira_Code({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"], display: "swap" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} ${mono.variable} min-h-screen bg-background font-sans text-foreground`}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 pb-48">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
