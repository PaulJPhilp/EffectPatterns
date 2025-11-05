"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { BookOpen } from "lucide-react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { CustomInstructions } from "./custom-instructions";
import { PlusIcon, VercelIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";
import { MemoriesGuideDialog } from "./memories-guide";
import type { UserPreferences } from "@/lib/memory";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  preferences,
  onUpdatePreferences,
  isLoadingPreferences,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  preferences: UserPreferences | null;
  onUpdatePreferences: (customInstructions: string) => Promise<void>;
  isLoadingPreferences?: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const [showMemoriesGuide, setShowMemoriesGuide] = useState(false);

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      {!isReadonly && (
        <>
          <VisibilitySelector
            chatId={chatId}
            className="order-1 md:order-2"
            selectedVisibilityType={selectedVisibilityType}
          />
          <CustomInstructions
            preferences={preferences}
            onUpdate={onUpdatePreferences}
            isLoading={isLoadingPreferences}
          />
        </>
      )}

      <Button
        onClick={() => setShowMemoriesGuide(true)}
        variant="outline"
        size="sm"
        className="order-2 md:order-3 md:ml-auto"
        title="Learn about Memories"
      >
        <BookOpen className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Memories</span>
      </Button>

      <Button
        asChild
        className="order-3 hidden bg-zinc-900 px-2 text-zinc-50 hover:bg-zinc-800 md:ml-auto md:flex md:h-fit dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <Link
          href={"https://vercel.com/templates/next.js/nextjs-ai-chatbot"}
          rel="noreferrer"
          target="_noblank"
        >
          <VercelIcon size={16} />
          Deploy with Vercel
        </Link>
      </Button>

      <MemoriesGuideDialog open={showMemoriesGuide} onOpenChange={setShowMemoriesGuide} />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.preferences === nextProps.preferences &&
    prevProps.isLoadingPreferences === nextProps.isLoadingPreferences
  );
});
