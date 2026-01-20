import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { RuleSchema } from "../../schema";

describe("RuleSchema", () => {
    it("should validate a complete rule object", () => {
        const validRule = {
            id: "test-rule",
            title: "Test Rule",
            description: "A test rule for validation",
            skillLevel: "beginner",
            useCase: ["testing", "validation"],
            content: "This is the rule content",
        };

        const result = Effect.runSync(Schema.decodeUnknown(RuleSchema)(validRule));
        expect(result).toEqual(validRule);
    });

    it("should validate a minimal rule object", () => {
        const minimalRule = {
            id: "minimal-rule",
            title: "Minimal Rule",
            description: "A minimal rule",
            content: "Minimal content",
        };

        const result = Effect.runSync(
            Schema.decodeUnknown(RuleSchema)(minimalRule),
        );
        expect(result).toEqual(minimalRule);
    });

    it("should reject invalid rule objects", () => {
        const invalidRules = [
            { id: "", title: "Test", description: "Test", content: "Content" }, // empty id
            { id: "test", title: "", description: "Test", content: "Content" }, // empty title
            { id: "test", title: "Test", description: "", content: "Content" }, // empty description
            { id: "test", title: "Test", description: "Test", content: "" }, // empty content
            { id: "test", title: "Test", description: "Test" }, // missing content
            {}, // missing all required fields
        ];

        invalidRules.forEach((invalidRule) => {
            expect(() => {
                Effect.runSync(Schema.decodeUnknown(RuleSchema)(invalidRule));
            }).toThrow(/ParseError|FiberFailure/);
        });
    });

    it("should handle optional fields correctly", () => {
        const ruleWithOptionals = {
            id: "optional-rule",
            title: "Optional Rule",
            description: "Rule with optionals",
            content: "Content",
            skillLevel: "advanced",
            useCase: ["production", "performance"],
        };

        const result = Effect.runSync(
            Schema.decodeUnknown(RuleSchema)(ruleWithOptionals),
        );
        expect(result.skillLevel).toBe("advanced");
        expect(result.useCase).toEqual(["production", "performance"]);
    });

    it("should accept rule without optional fields", () => {
        const ruleWithoutOptionals = {
            id: "no-optionals",
            title: "No Optionals",
            description: "Rule without optionals",
            content: "Content",
        };

        const result = Effect.runSync(
            Schema.decodeUnknown(RuleSchema)(ruleWithoutOptionals),
        );
        expect(result.skillLevel).toBeUndefined();
        expect(result.useCase).toBeUndefined();
    });
});
