import { redirect } from "next/navigation";
import { MemoriesFeatureHighlight, MemoriesQuickTips } from "@/components/memories-guide";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "../../(auth)/auth";

export default async function MemoriesPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-8 dark:from-blue-950 dark:to-indigo-950">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl">💾</span>
            <div>
              <h1 className="text-4xl font-bold">Guide to Memories</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Learn how the Code Assistant remembers and learns from your conversations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
          {/* Quick Overview */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">What Are Memories?</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Memories are intelligent, searchable records of your conversations with the Code Assistant.
              Every chat you have is automatically stored, tagged, and made searchable so you can find
              solutions you've already explored without having to remember the exact details.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Using advanced semantic search powered by Supermemory, the system understands the meaning
              of your questions and finds similar past conversations, even if the wording is different.
            </p>
          </section>

          {/* Key Features */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Key Features</h2>
            <MemoriesFeatureHighlight className="grid-cols-1 sm:grid-cols-2" />
          </section>

          {/* How It Works */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">How It Works</h2>
            <div className="grid gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">1. Automatic Storage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Every conversation is automatically saved when it completes. No manual work required.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">2. Auto-Tagging</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Conversations are automatically tagged with relevant topics like "effect-ts", "error-handling", etc.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">3. Semantic Embedding</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Conversations are converted to semantic embeddings (vectors) that capture meaning, enabling intelligent search.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">4. Outcome Classification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The system detects if your issue was solved, partially solved, unsolved, or revisited.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">5. Smart Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Find conversations by meaning (60% semantic), keywords (30%), recency (7%), and satisfaction (3%).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">6. Learning Journey</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your memories become a personalized knowledge base that grows with you and accelerates your learning.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Quick Tips */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Quick Tips</h2>
            <MemoriesQuickTips />
          </section>

          {/* Privacy & Security */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Privacy & Security</h2>
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>🛡️</span> Your Data is Safe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>✓ Only you can access your memories - complete data isolation</p>
                <p>✓ All data is encrypted at rest and in transit</p>
                <p>✓ No sharing with other users or third parties</p>
                <p>✓ You can delete conversations anytime - deletion is permanent and immediate</p>
                <p>✓ Privacy-first design with full transparency</p>
              </CardContent>
            </Card>
          </section>

          {/* Search Tips */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Search Tips</h2>
            <div className="grid gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Be Specific</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="mb-2">Good: "How do I handle async errors in Effect?"</p>
                  <p>Not ideal: "async"</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Use Natural Language</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                  Type like you're asking a friend. The semantic search understands context and meaning.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Try Different Wording</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                  If the first search doesn't find what you need, try rephrasing. Semantic search finds similar concepts.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Filter by Tags & Outcomes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                  Search by specific tags or filter for "solved" conversations to find solutions that worked before.
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Getting Started */}
          <section className="space-y-4 pb-8">
            <h2 className="text-2xl font-bold">Getting Started</h2>
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>🚀</span> Start Using Memories Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="font-semibold">Today:</p>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>✓ Your conversations are automatically saved</li>
                    <li>✓ They're automatically tagged and analyzed</li>
                    <li>✓ You can search them anytime</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">Next Week:</p>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>✓ Search for topics you've discussed before</li>
                    <li>✓ See patterns in your conversations</li>
                    <li>✓ Find solutions to recurring problems</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">This Month:</p>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>✓ Your memory library becomes a personalized knowledge base</li>
                    <li>✓ Accelerate learning on new topics</li>
                    <li>✓ Track your expertise growth</li>
                  </ul>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button asChild>
                    <Link href="/">Start Chatting</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/">Learn More</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
