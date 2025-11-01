"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { memoriesQuickTips } from "@/lib/memories-guide";

export function MemoriesWelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if user has seen the welcome banner
    const hasSeenBanner = localStorage.getItem("memories-welcome-seen");
    if (!hasSeenBanner) {
      setIsDismissed(false);
      setIsVisible(true);
    }
  }, []);

  if (!isVisible || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem("memories-welcome-seen", "true");
    setIsDismissed(true);
  };

  const selectedTips = memoriesQuickTips.slice(0, 3);

  return (
    <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-3xl">💾</span>
            <div>
              <CardTitle className="text-lg">Welcome to Memories!</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Your conversations are automatically saved and searchable
              </CardDescription>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Tips Grid */}
        <div className="grid gap-2">
          {selectedTips.map((tip, idx) => (
            <div key={idx} className="text-sm">
              <p className="font-semibold text-gray-900 dark:text-gray-50">{tip.title}</p>
              <p className="text-gray-700 dark:text-gray-300">{tip.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Link href="/memories" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Read Full Guide
            </Link>
          </Button>
          <Button variant="outline" onClick={handleDismiss}>
            Got it!
          </Button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-600 dark:text-gray-400 pt-2">
          💡 Tip: Every conversation is automatically tagged and made searchable. No setup needed!
        </p>
      </CardContent>
    </Card>
  );
}
