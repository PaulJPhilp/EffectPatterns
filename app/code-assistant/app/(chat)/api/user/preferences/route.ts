import { auth } from "@/app/(auth)/auth";
import { getUserPreferences, setUserPreferences, type UserPreferences } from "@/lib/memory";
import { ChatSDKError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:api").toResponse();
    }

    const preferences = await getUserPreferences(session.user.id);

    return Response.json({ preferences });
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:api").toResponse();
    }

    const body = await request.json();
    const { preferences }: { preferences: Partial<UserPreferences> } = body;

    if (!preferences) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    await setUserPreferences(session.user.id, preferences);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error setting user preferences:", error);
    return new ChatSDKError("offline:api").toResponse();
  }
}
