"use client";

import { memo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { memoriesGuide, memoriesQuickTips } from "@/lib/memories-guide";

interface MemoriesGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PureMemoriesGuideDialog({ open, onOpenChange }: MemoriesGuideDialogProps) {
  const [selectedSection, setSelectedSection] = useState<string>("what-are-memories");

  const activeSection = memoriesGuide.sections.find((s) => s.id === selectedSection);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-hidden p-0">
        <div className="flex flex-col gap-0">
          {/* Header */}
          <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 dark:from-blue-950 dark:to-indigo-950">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl">{memoriesGuide.title}</DialogTitle>
              <DialogDescription className="text-base">
                {memoriesGuide.description}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="flex flex-1 gap-0 overflow-hidden">
            {/* Sidebar Navigation */}
            <ScrollArea className="w-48 border-r">
              <div className="space-y-1 p-4">
                {memoriesGuide.sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                      selectedSection === section.id
                        ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-50"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Main Content */}
            <ScrollArea className="flex-1">
              <div className="space-y-6 p-6">
                {activeSection && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{activeSection.icon}</span>
                        <h2 className="text-2xl font-bold">{activeSection.title}</h2>
                      </div>
                    </div>

                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {activeSection.content.split("\n\n").map((paragraph, idx) => (
                        <p
                          key={idx}
                          className="whitespace-pre-wrap text-gray-700 leading-relaxed dark:text-gray-300"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-3 dark:bg-gray-900">
            <Button onClick={() => onOpenChange(false)} variant="default" className="w-full">
              Got it! Close Guide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const MemoriesGuideDialog = memo(PureMemoriesGuideDialog);

/**
 * Quick Tips Card Component
 * Shows a compact overview of key memory features
 */
interface MemoriesQuickTipsProps {
  className?: string;
}

function PureMemoriesQuickTips({ className }: MemoriesQuickTipsProps) {
  const [showMore, setShowMore] = useState(false);

  const visibleTips = showMore ? memoriesQuickTips : memoriesQuickTips.slice(0, 3);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>💡</span> Memories Quick Tips
        </CardTitle>
        <CardDescription>Learn how to get the most from your memory library</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {visibleTips.map((tip, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950"
            >
              <h4 className="font-semibold text-blue-900 dark:text-blue-50">{tip.title}</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{tip.description}</p>
            </div>
          ))}
        </div>

        {!showMore && memoriesQuickTips.length > 3 && (
          <Button
            onClick={() => setShowMore(true)}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Show {memoriesQuickTips.length - 3} More Tips
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export const MemoriesQuickTips = memo(PureMemoriesQuickTips);

/**
 * Feature Highlight Component
 * Displays key features of the memories system
 */
interface MemoriesFeatureHighlightProps {
  className?: string;
}

function PureMemoriesFeatureHighlight({ className }: MemoriesFeatureHighlightProps) {
  const features = [
    {
      icon: "🔍",
      title: "Smart Search",
      description: "Find conversations by meaning, not just keywords",
    },
    {
      icon: "🏷️",
      title: "Auto-Tagged",
      description: "Conversations are automatically organized by topic",
    },
    {
      icon: "📊",
      title: "Outcome Tracking",
      description: "Know which solutions actually worked",
    },
    {
      icon: "🛡️",
      title: "Private & Secure",
      description: "Your memories are encrypted and personal",
    },
  ];

  return (
    <div className={`grid gap-4 ${className}`}>
      {features.map((feature, idx) => (
        <div key={idx} className="flex gap-3 rounded-lg border p-3 hover:bg-blue-50 dark:hover:bg-blue-950">
          <span className="text-2xl">{feature.icon}</span>
          <div>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const MemoriesFeatureHighlight = memo(PureMemoriesFeatureHighlight);

/**
 * Inline Info Banner
 * Lightweight component to display memories info
 */
interface MemoriesInfoBannerProps {
  onLearnMore?: () => void;
}

function PureMemoriesInfoBanner({ onLearnMore }: MemoriesInfoBannerProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl">💾</span>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-50">
            Your conversations are automatically saved!
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            This chat will be tagged, indexed, and made searchable. You can search past conversations
            anytime to find similar solutions.
          </p>
        </div>
        {onLearnMore && (
          <Button
            onClick={onLearnMore}
            variant="ghost"
            size="sm"
            className="whitespace-nowrap text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
          >
            Learn More
          </Button>
        )}
      </div>
    </div>
  );
}

export const MemoriesInfoBanner = memo(PureMemoriesInfoBanner);
