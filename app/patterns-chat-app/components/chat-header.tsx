"use client";

import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserPreferences } from "@/lib/memory";
import { BookOpen, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { CustomInstructions } from "./custom-instructions";
import { PlusIcon } from "./icons";
import { MemoriesGuideDialog } from "./memories-guide";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

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
  const [showSettings, setShowSettings] = useState(false);

  const { width: windowWidth } = useWindowSize();

  const handleNewChat = () => {
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-4 border-b">
      <SidebarToggle />

      {/* Logo/Title */}
      <span className="font-semibold text-lg">Patterns Chat</span>

      {/* Main Menu Bar */}
      <nav className="ml-auto flex items-center gap-1">
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleNewChat}>
              <PlusIcon size={16} />
              <span className="ml-2">New Chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowMemoriesGuide(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Memories</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Menu */}
        {!isReadonly && (
          <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
                <span className="ml-1">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem asChild>
                <div
                  className="flex items-center justify-between py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-sm">Visibility</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <VisibilitySelector
                  chatId={chatId}
                  selectedVisibilityType={selectedVisibilityType}
                  className="w-full"
                />
              </div>
              <DropdownMenuSeparator />
              <div
                className="px-2 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <CustomInstructions
                  preferences={preferences}
                  onUpdate={onUpdatePreferences}
                  isLoading={isLoadingPreferences}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

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
