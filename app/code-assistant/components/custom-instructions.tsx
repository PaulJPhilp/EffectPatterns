"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";
import type { UserPreferences } from "@/lib/memory";

interface CustomInstructionsProps {
  preferences: UserPreferences | null;
  onUpdate: (customInstructions: string) => Promise<void>;
  isLoading?: boolean;
}

export function CustomInstructions({
  preferences,
  onUpdate,
  isLoading = false,
}: CustomInstructionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preferences?.customInstructions) {
      setCustomInstructions(preferences.customInstructions);
    }
  }, [preferences?.customInstructions, isOpen]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onUpdate(customInstructions);
      toast({ type: "success", description: "Custom instructions saved!" });
      setIsOpen(false);
    } catch (error) {
      toast({ type: "error", description: "Failed to save custom instructions" });
      console.error("Error saving custom instructions:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasInstructions = customInstructions.trim().length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          title="Set custom instructions for AI responses"
        >
          {hasInstructions ? "✓ Custom Instructions" : "Custom Instructions"}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Custom Instructions</SheetTitle>
          <SheetDescription>
            Add custom instructions that will be included in every AI response.
            These instructions will help shape how the AI responds to your queries.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="instructions">
              Your Instructions
              <span className="ml-2 text-xs text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="instructions"
              placeholder="E.g., 'Always provide examples', 'Use simple language', 'Include code snippets when relevant'"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[150px] resize-none"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {customInstructions.length} characters
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-semibold mb-2">Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Be clear and concise about your preferences</li>
              <li>Include specific formatting or style preferences</li>
              <li>Mention any domains or topics you specialize in</li>
              <li>Keep it under 500 characters for best results</li>
            </ul>
          </div>
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Instructions"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
