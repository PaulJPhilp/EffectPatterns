import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";
import { chatModels } from "@/lib/ai/models";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

test.describe("Smoke Tests", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test.describe("Multi-Model Message Submission - 'What is Paris?'", () => {
    /**
     * Smoke test that validates basic message submission across all available models.
     * This is a regression test for the operator precedence bug (GitHub issue) that
     * caused valid messages to be rejected with "Message is too long" error.
     *
     * Test matrix: Each model tests that:
     * 1. Short, valid messages are accepted
     * 2. Submit button is not disabled
     * 3. Generation completes without errors
     * 4. Assistant message is received
     */
    chatModels.forEach((model) => {
      test(`Send "What is Paris?" with ${model.name}`, async ({ page }) => {
        // Step 1: Select the model
        const modelSelector = page.locator('[data-testid="model-selector"]');
        if (modelSelector) {
          await modelSelector.click();
          const modelOption = page.locator(
            `button:has-text("${model.name}")`
          );
          await modelOption.click();
        }

        // Step 2: Verify send button is enabled (not disabled by false length check)
        await expect(chatPage.sendButton).toBeVisible();
        // Initially disabled (empty input), should enable after typing

        // Step 3: Send the message
        const testMessage = "What is Paris?";
        await chatPage.multimodalInput.click();
        await chatPage.multimodalInput.fill(testMessage);

        // Step 4: Verify send button is now enabled
        await expect(chatPage.sendButton).not.toBeDisabled();

        // Step 5: Click send
        await chatPage.sendButton.click();

        // Step 6: Verify message was submitted
        const userMessage = await chatPage.getRecentUserMessage();
        expect(userMessage.content).toBe(testMessage);

        // Step 7: Wait for generation to complete
        await chatPage.isGenerationComplete();

        // Step 8: Verify assistant response was received
        const assistantMessage = await chatPage.getRecentAssistantMessage();
        expect(assistantMessage.content).toBeTruthy();
        expect(assistantMessage.content.length).toBeGreaterThan(0);
      });
    });
  });

  test.describe("Input Validation", () => {
    test("Should accept short message without rejection", async () => {
      const shortMessage = "Hi";
      await chatPage.multimodalInput.click();
      await chatPage.multimodalInput.fill(shortMessage);

      // Send button should be enabled
      await expect(chatPage.sendButton).not.toBeDisabled();
      await chatPage.sendButton.click();

      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toBe(shortMessage);
    });

    test("Should accept message with punctuation", async () => {
      const messageWithPunctuation = "What is Paris?!";
      await chatPage.multimodalInput.click();
      await chatPage.multimodalInput.fill(messageWithPunctuation);

      await expect(chatPage.sendButton).not.toBeDisabled();
      await chatPage.sendButton.click();

      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toBe(messageWithPunctuation);
    });

    test("Should accept question with numbers", async () => {
      const messageWithNumbers = "What is 2 + 2?";
      await chatPage.multimodalInput.click();
      await chatPage.multimodalInput.fill(messageWithNumbers);

      await expect(chatPage.sendButton).not.toBeDisabled();
      await chatPage.sendButton.click();

      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toBe(messageWithNumbers);
    });

    test("Should reject message over MAX_MESSAGE_LENGTH characters", async () => {
      const longMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);
      await chatPage.multimodalInput.click();
      await chatPage.multimodalInput.fill(longMessage);

      // Send button should be disabled for oversized message
      await expect(chatPage.sendButton).toBeDisabled();
    });
  });

  test.describe("Message Length Validation Edge Cases", () => {
    test("Should accept message at exactly MAX_MESSAGE_LENGTH characters", async () => {
      const maxMessage = "a".repeat(MAX_MESSAGE_LENGTH);
      await chatPage.multimodalInput.click();
      await chatPage.multimodalInput.fill(maxMessage);

      // Send button should be enabled at exactly max length
      await expect(chatPage.sendButton).not.toBeDisabled();
    });

    test("Should reject message at MAX_MESSAGE_LENGTH + 1 characters", async () => {
      const tooLongMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);
      await chatPage.multimodalInput.click();
      await chatPage.multimodalInput.fill(tooLongMessage);

      // Send button should be disabled
      await expect(chatPage.sendButton).toBeDisabled();
    });

    test("Truncates message when filling input past limit", async () => {
      const tooLongMessage = "a".repeat(MAX_MESSAGE_LENGTH + 200);
      await chatPage.multimodalInput.click();
      await chatPage.multimodalInput.fill(tooLongMessage);

      // Value should be truncated to MAX_MESSAGE_LENGTH
      const value = await chatPage.multimodalInput.inputValue();
      expect(value.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });
  });
});
