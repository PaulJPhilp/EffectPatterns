import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type { ReactNode } from "react";

export const metadata = {
  title: "Learn Effect Patterns - Interactive Playground",
  description: "Interactive learning environment for Effect-TS patterns",
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full bg-background">
      {children}
    </div>
  );
}

