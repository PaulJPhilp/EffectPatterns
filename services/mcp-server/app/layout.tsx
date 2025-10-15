import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Effect Patterns MCP Server',
  description: 'API server for Effect Patterns Claude Code Plugin',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
