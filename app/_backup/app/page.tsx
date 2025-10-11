"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.openai) {
      (window as any).openai = {};
    }

    let currentValue = (window as any).openai.toolOutput;

    Object.defineProperty((window as any).openai, "toolOutput", {
      get() {
        return currentValue;
      },
      set(newValue: any) {
        currentValue = newValue;
        if (newValue?.name) {
          setName(newValue.name);
        }
      },
      configurable: true,
      enumerable: true,
    });

    if (currentValue?.name) {
      setName(currentValue.name);
    }
  }, []);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Welcome to the ChatGPT Apps SDK Next.js Starter
          </li>
          <li className="mb-2 tracking-[-.01em]">
            Name returned from tool call: {name ?? "..."}
          </li>
          <li className="mb-2 tracking-[-.01em]">
            MCP server path: <Link href="/mcp" className="underline">/mcp</Link>
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link  
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
          prefetch={false} href="/client-page" >
            Visit another page
          </Link>
          <a href="https://vercel.com/templates/ai/chatgpt-app-with-next-js" target="_blank" rel="noopener noreferrer" className="underline">
              Deploy on Vercel
            </a>
        </div>
      </main>
    </div>
  );
}
