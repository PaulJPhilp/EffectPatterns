import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL, chatModelIdSchema } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";
import { getUserPreferences } from "@/lib/memory";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  // Load user preferences from memory
  let userPreferences: { selectedModel?: string } = {};
  try {
    const prefs = await getUserPreferences(session.user.id);
    userPreferences = { selectedModel: prefs.selectedModel };
  } catch (error) {
    console.warn("Failed to load user preferences:", error);
  }

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  // Validate and parse the model ID: preferences > cookie > default
  let initialModel = DEFAULT_CHAT_MODEL;
  const candidateModel = userPreferences.selectedModel || modelIdFromCookie?.value;
  if (candidateModel) {
    const parseResult = chatModelIdSchema.safeParse(candidateModel);
    if (parseResult.success) {
      initialModel = parseResult.data;
    }
    // If parsing fails, fall back to default
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={initialModel}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
