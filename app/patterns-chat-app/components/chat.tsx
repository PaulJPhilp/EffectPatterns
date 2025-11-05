"use client";

import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { ChatModelId } from "@/lib/ai/models";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import type { Attachment, ChatMessage, CustomUIDataTypes } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetchWithErrorHandlers, fetcher, generateUUID } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import type { DataUIPart } from "ai";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: ChatModelId;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();
  const { preferences, loading: preferencesLoading, updatePreference } = useUserPreferences();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<ChatModelId>(initialChatModel);
  const currentModelIdRef = useRef<ChatModelId>(currentModelId);
  
  // Manual override to force-allow sending messages after model change
  const [forceReady, setForceReady] = useState(false);

  // If preferences are still loading, defer rendering until they're available
  const isInitializing = preferencesLoading;

  // Add global error handler for unhandled promise rejections from streaming
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if this is an error we've already handled
      const reason = event.reason;
      
      // Handle Error objects
      if (reason instanceof Error) {
        const message = reason.message;
        const errorName = reason.name;
        
        // If it matches one of our handled error patterns, prevent the default behavior
        if (
          message?.includes("doesn't have any credits") ||
          message?.includes("credit balance is too low") ||
          message?.includes("Forbidden") ||
          message?.includes("403") ||
          message?.includes("rate limit") ||
          message?.includes("exceeded your maximum number") ||
          message?.includes("429") ||
          message?.includes("API key") ||
          message?.includes("401") ||
          message?.includes("Unauthorized") ||
          errorName === "AI_APICallError"
        ) {
          // Prevent the error from showing in console/overlay
          event.preventDefault();
          // Silently handled - toast already shown
          return;
        }
      }
      
      // Handle AI_APICallError objects that might not be instanceof Error
      if (reason?.name === "AI_APICallError" || reason?.constructor?.name === "AI_APICallError") {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Store stop function ref so handleModelChange can access it
  const stopRef = useRef<(() => void) | null>(null);
  
  // Remember model choice in user preferences
  const handleModelChange = async (modelId: ChatModelId) => {
    // Stop any ongoing generation when switching models
    if (stopRef.current) {
      stopRef.current();
    }
    
    // Force the chat to be ready for new messages
    setForceReady(true);
    
    // Update ref first (synchronously) to ensure it's used in next message
    currentModelIdRef.current = modelId;
    // Then update state (asynchronously) for re-render
    setCurrentModelId(modelId);
    try {
      await updatePreference("selectedModel", modelId);
    } catch (error) {
      console.warn("Failed to save model preference:", error);
    }
  };

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers as typeof fetch,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => {
        const updated = ds ? [...ds, dataPart] : [dataPart];
        return updated as DataUIPart<CustomUIDataTypes>[];
      });
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data as AppUsage);
      }
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      // Clear the forceReady flag when a message finishes normally
      setForceReady(false);
    },
    onError: (error) => {
      // Clear the forceReady flag on error so user can try again
      setForceReady(false);
      
      if (error instanceof ChatSDKError) {
        // Check if it's a credit card error
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
          return;
        }
        
        // Show toast for all other ChatSDKErrors (rate limit, auth, etc.)
        toast({
          type: "error",
          description: error.message,
        });
        return;
      }
      
      // Handle streaming errors (API errors that occur during generation)
      if (error instanceof Error) {
        let errorMessage = "An error occurred. Please try again.";
        let isKnownError = false;
        
        // xAI credit/permission errors
        if (error.message?.includes("doesn't have any credits") || 
            error.message?.includes("credit balance is too low") ||
            error.message?.includes("Forbidden")) {
          errorMessage = "This model requires credits. Please check your API provider's billing and add credits.";
          isKnownError = true;
        }
        // Anthropic credit errors
        else if (error.message?.includes("credit balance is too low")) {
          errorMessage = "Insufficient API credits. Please add credits to your Anthropic account.";
          isKnownError = true;
        }
        // Rate limiting
        else if (error.message?.includes("rate limit") || error.message?.includes("429")) {
          errorMessage = "Rate limit exceeded. Please try again in a moment.";
          isKnownError = true;
        }
        // Permission/auth errors
        else if (error.message?.includes("permission") || error.message?.includes("403")) {
          errorMessage = "API access denied. Please check your API key has the correct permissions.";
          isKnownError = true;
        }
        // API key errors
        else if (error.message?.includes("API key") || 
                 error.message?.includes("401") ||
                 error.message?.includes("Unauthorized")) {
          errorMessage = "Invalid API key. Please check your environment configuration.";
          isKnownError = true;
        }
        // Network errors
        else if (error.message?.includes("fetch failed") || 
                 error.message?.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
          isKnownError = true;
        }
        
        // Only log unexpected errors
        if (!isKnownError) {
          console.error("[Chat Error]", {
            message: error.message,
            name: error.name,
          });
        }
        
        toast({
          type: "error",
          description: errorMessage,
        });
        return;
      }
      
      // Fallback for unknown errors
      console.error("[Chat Error]", error);
      toast({
        type: "error",
        description: "An unexpected error occurred. Please try again.",
      });
    },
  });

  // Store stop function so handleModelChange can access it
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);
  
  // Compute effective status - override to "ready" if forceReady is true
  const effectiveStatus = forceReady ? "ready" : status;
  
  // Wrap sendMessage to clear forceReady when a new message is sent
  const wrappedSendMessage: typeof sendMessage = (...args) => {
    setForceReady(false);
    return sendMessage(...args);
  };

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      wrappedSendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, wrappedSendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // Show loading state while preferences are being loaded
  if (isInitializing) {
    return (
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
          preferences={preferences}
          onUpdatePreferences={(customInstructions) =>
            updatePreference("customInstructions", customInstructions)
          }
          isLoadingPreferences={preferencesLoading}
        />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={effectiveStatus}
          votes={votes}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          {!isReadonly && (
            <MultimodalInput
              attachments={attachments}
              chatId={id}
              input={input}
              messages={messages}
              onModelChange={handleModelChange}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={wrappedSendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              status={effectiveStatus}
              stop={stop}
              usage={usage}
            />
          )}
        </div>
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={wrappedSendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={effectiveStatus}
        stop={stop}
        votes={votes}
      />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
