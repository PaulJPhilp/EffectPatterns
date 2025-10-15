import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Effect Patterns AI Assistant',
  description: 'AI-powered code reviewer and learning tool for Effect-TS',
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
