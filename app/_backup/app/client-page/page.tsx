"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-black tracking-tight">Welcome</h1>
        <p className="font-mono text-sm/6 text-center sm:text-left tracking-[-.01em] max-w-xl">
          This is a client-side rendered page demonstrating navigation in your ChatGPT app.
        </p>
        <Link 
          href="/"
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
        >
          Go to the main page
        </Link>
      </main>
    </div>
  );
}
