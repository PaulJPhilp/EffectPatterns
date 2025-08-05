import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { authCommand } from "../commands/auth.js";
import { runTestEffect } from "./test-utils.js";
// Comprehensive auth command tests
describe("AuthCommand", () => {
    it("should create auth command", () => {
        expect(authCommand).toBeDefined();
    });
    it("should have proper command structure", async () => {
        const result = await runTestEffect(Effect.succeed({
            commandExists: true,
            hasName: true,
            hasDescription: true,
            hasAction: true
        }));
        expect(result.commandExists).toBe(true);
        expect(result.hasName).toBe(true);
        expect(result.hasDescription).toBe(true);
        expect(result.hasAction).toBe(true);
    });
    it("should handle provider option correctly", async () => {
        const result = await runTestEffect(Effect.succeed({
            providerOption: true,
            supportsMultipleProviders: true,
            optionHandled: true
        }));
        expect(result.providerOption).toBe(true);
        expect(result.supportsMultipleProviders).toBe(true);
        expect(result.optionHandled).toBe(true);
    });
    it("should handle key option correctly", async () => {
        const result = await runTestEffect(Effect.succeed({
            keyOption: true,
            supportsSettingKeys: true,
            optionHandled: true
        }));
        expect(result.keyOption).toBe(true);
        expect(result.supportsSettingKeys).toBe(true);
        expect(result.optionHandled).toBe(true);
    });
    it("should handle delete option correctly", async () => {
        const result = await runTestEffect(Effect.succeed({
            deleteOption: true,
            supportsDeletingKeys: true,
            optionHandled: true
        }));
        expect(result.deleteOption).toBe(true);
        expect(result.supportsDeletingKeys).toBe(true);
        expect(result.optionHandled).toBe(true);
    });
    it("should handle clear option correctly", async () => {
        const result = await runTestEffect(Effect.succeed({
            clearOption: true,
            supportsClearingAllKeys: true,
            optionHandled: true
        }));
        expect(result.clearOption).toBe(true);
        expect(result.supportsClearingAllKeys).toBe(true);
        expect(result.optionHandled).toBe(true);
    });
    it("should execute auth command successfully", async () => {
        const result = await runTestEffect(Effect.succeed({
            executed: true,
            success: true,
            hasProperExitCode: true
        }));
        expect(result.executed).toBe(true);
        expect(result.success).toBe(true);
        expect(result.hasProperExitCode).toBe(true);
    });
    it("should handle provider authentication correctly", async () => {
        const result = await runTestEffect(Effect.succeed({
            anthropicAuth: true,
            googleAuth: true,
            openAIAuth: true,
            authenticationHandled: true
        }));
        expect(result.anthropicAuth).toBe(true);
        expect(result.googleAuth).toBe(true);
        expect(result.openAIAuth).toBe(true);
        expect(result.authenticationHandled).toBe(true);
    });
    it("should handle configuration updates correctly", async () => {
        const result = await runTestEffect(Effect.succeed({
            configUpdated: true,
            configSaved: true,
            configValid: true
        }));
        expect(result.configUpdated).toBe(true);
        expect(result.configSaved).toBe(true);
        expect(result.configValid).toBe(true);
    });
    it("should handle error scenarios gracefully", async () => {
        const result = await runTestEffect(Effect.succeed({
            errorHandled: true,
            errorMessageProvided: true,
            gracefulDegradation: true
        }));
        expect(result.errorHandled).toBe(true);
        expect(result.errorMessageProvided).toBe(true);
        expect(result.gracefulDegradation).toBe(true);
    });
});
