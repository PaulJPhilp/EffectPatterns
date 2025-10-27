import React from "react";
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Effect Patterns Hub',
  description:
    'Learn Effect through curated roadmaps, interactive patterns, and AI-assisted learning',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
