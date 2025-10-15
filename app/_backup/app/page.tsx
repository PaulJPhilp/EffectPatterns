'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.openai) {
      (window as any).openai = {};
    }

    let currentValue = (window as any).openai.toolOutput;

    Object.defineProperty((window as any).openai, 'toolOutput', {
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
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-sans sm:p-20">
      <main className="row-start-2 flex flex-col items-center gap-[32px] sm:items-start">
        <Image
          alt="Next.js logo"
          className="dark:invert"
          height={38}
          priority
          src="/next.svg"
          width={180}
        />
        <ol className="list-inside list-decimal text-center font-mono text-sm/6 sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Welcome to the ChatGPT Apps SDK Next.js Starter
          </li>
          <li className="mb-2 tracking-[-.01em]">
            Name returned from tool call: {name ?? '...'}
          </li>
          <li className="mb-2 tracking-[-.01em]">
            MCP server path:{' '}
            <Link className="underline" href="/mcp">
              /mcp
            </Link>
          </li>
        </ol>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-transparent border-solid bg-foreground px-4 font-medium text-background text-sm transition-colors hover:bg-[#383838] sm:h-12 sm:w-auto sm:px-5 sm:text-base dark:hover:bg-[#ccc]"
            href="/client-page"
            prefetch={false}
          >
            Visit another page
          </Link>
          <a
            className="underline"
            href="https://vercel.com/templates/ai/chatgpt-app-with-next-js"
            rel="noopener noreferrer"
            target="_blank"
          >
            Deploy on Vercel
          </a>
        </div>
      </main>
    </div>
  );
}
