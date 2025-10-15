'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-sans sm:p-20">
      <main className="row-start-2 flex flex-col items-center gap-[32px] sm:items-start">
        <h1 className="font-black text-4xl tracking-tight">Welcome</h1>
        <p className="max-w-xl text-center font-mono text-sm/6 tracking-[-.01em] sm:text-left">
          This is a client-side rendered page demonstrating navigation in your
          ChatGPT app.
        </p>
        <Link
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-transparent border-solid bg-foreground px-4 font-medium text-background text-sm transition-colors hover:bg-[#383838] sm:h-12 sm:px-5 sm:text-base dark:hover:bg-[#ccc]"
          href="/"
        >
          Go to the main page
        </Link>
      </main>
    </div>
  );
}
