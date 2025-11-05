import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { ErrorBoundary } from "@/components/error-boundary";
import { DEFAULT_CHAT_MODEL, chatModelIdSchema } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  // Validate and parse the model ID from the cookie
  let initialChatModel = DEFAULT_CHAT_MODEL;
  if (chatModelFromCookie?.value) {
    const parseResult = chatModelIdSchema.safeParse(chatModelFromCookie.value);
    if (parseResult.success) {
      initialChatModel = parseResult.data;
    }
    // If parsing fails, fall back to default
  }

  return (
    <>
      <ErrorBoundary>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={initialChatModel}
          initialLastContext={chat.lastContext ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
        />
      </ErrorBoundary>
      <DataStreamHandler />
    </>
  );
}
